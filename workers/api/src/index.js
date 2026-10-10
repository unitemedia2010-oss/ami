/**
 * =============================================================================
 *  Cloudflare Worker — API Gateway
 *  Website Bất động sản TP.HCM
 *
 *  Vai trò: đây là HÀNH LANG DUY NHẤT giữa trình duyệt và Supabase.
 *  Không có Worker thì không có chỗ để kiểm soát nhịp độ, chặn bot, giám sát.
 *
 *  Nhiệm vụ:
 *    1. CORS — chỉ nhận domain của bạn
 *    2. Chống bot — UA/ASN rác, honeypot URL
 *    3. Rate limit — token bucket trên KV, theo fingerprint
 *    4. Turnstile — bắt buộc với endpoint nhạy cảm
 *    5. Xác thực — verify Supabase JWT bằng Web Crypto
 *    6. Proxy — gọi Supabase bằng service_role (chỉ ở server)
 *    7. Ảnh — signed URL có hạn từ R2
 *    8. Giám sát — ghi cảnh báo bất thường
 *
 *  Tài liệu cấu hình: ./wrangler.toml
 * =============================================================================
 */

const ALLOWED_ORIGINS = ['https://bds.example.com', 'https://www.bds.example.com'];

const HONEYPOTS = [
  '/listing/all-export', '/api/v1/export-listings', '/data/dump.json',
  '/sitemap-listings.xml?all=1', '/admin/export', '/api/listings?all=true',
  '/download/contacts', '/api/contact-export',
];

const BOT_UA = /(curl|wget|python-requests|python-urllib|scrapy|httpx|aiohttp|go-http-client|java\/|okhttp|libwww-perl|headlesschrome|phantomjs|puppeteer|playwright|masscan|nmap|sqlmap)/i;

const CDN_DATACENTER = /AS16509|AS14618|AS14061|AS63949|AS396982|AS8075|AS13335|AS17493|AS16510/i;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Turnstile-Token',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';

    // ---- 0. CORS preflight -------------------------------------------------
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ---- 1. Honeypot: bẫy cho bot ----------------------------------------
    // Bot tự đi theo mọi link. Người dùng thật không thấy (đã bị ẩn bằng CSS).
    // Trả 404 để bot không biết mình bị phát hiện.
    if (HONEYPOTS.includes(path) || HONEYPOTS.includes(url.pathname + url.search)) {
      ctx.waitUntil(logAlert(env, 'honeypot_hit', 'high', {
        path, ua: request.headers.get('User-Agent'),
      }));
      return new Response('Not Found', { status: 404 });
    }

    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const ua = request.headers.get('User-Agent') || '';
    const fp = await fingerprint(ip, ua, env);   // hash HMAC — KHÔNG lưu IP gốc

    // ---- 2. Chặn bot rõ ràng ---------------------------------------------
    if (!ua || BOT_UA.test(ua) || (env.BLOCK_DATACENTER && CDN_DATACENTER.test(ip))) {
      ctx.waitUntil(logAlert(env, 'bot_detected', 'medium', { ua: ua.slice(0, 120) }));
      return json({ error: 'Forbidden' }, 403, corsHeaders(origin));
    }

    // ---- 3. Rate limit -----------------------------------------------------
    const tier = path.startsWith('/api/contact') ? { n: 30,  win: 3600 }
               : path.startsWith('/api/admin')  ? { n: 300, win: 3600 }
               :                                { n: 240, win: 3600 };
    const rl = await rateLimit(fp, tier, env);
    if (!rl.ok) {
      ctx.waitUntil(logAlert(env, 'rate_limit', 'low', { path, n: rl.count }));
      return json({ error: 'Too many requests', retry_after: rl.retryAfter }, 429,
        { ...corsHeaders(origin), 'Retry-After': String(rl.retryAfter) });
    }

    // ---- 4. Kiểm tra IP đã bị chặn chưa ---------------------------------
    const blocked = await env.KV?.get(`blocked:${fp}`);
    if (blocked && new Date(blocked) > new Date()) {
      return json({ error: 'Blocked' }, 403, corsHeaders(origin));
    }

    // ---- 5. Định tuyến -----------------------------------------------------
    try {
      // ---- PUBLIC: danh sách tin (không cần đăng nhập) ------------------
      if (path === '/api/listings' && request.method === 'GET') {
        return withCache(request, ctx, env, corsHeaders(origin), async () => {
          const body = await callRpc(env, 'api_listings', {
            p_type:     url.searchParams.get('type'),
            p_district: num(url.searchParams.get('district')),
            p_ward:     num(url.searchParams.get('ward')),
            p_project:  url.searchParams.get('project'),
            p_min:      num(url.searchParams.get('min')),
            p_max:      num(url.searchParams.get('max')),
            p_bedrooms: num(url.searchParams.get('bedrooms')),
            p_keyword:  url.searchParams.get('q'),
            p_sort:     url.searchParams.get('sort') || 'newest',
            p_page:     num(url.searchParams.get('page')) || 1,
            p_per_page: num(url.searchParams.get('per_page')) || 24,
          });
          return json(body, 200, corsHeaders(origin));
        });
      }

      // ---- PUBLIC: tìm kiếm đơn vị hành chính (hỗ trợ tên quận cũ) -----
      if (path === '/api/search-units' && request.method === 'GET') {
        const q = url.searchParams.get('q') || '';
        const body = await callRpc(env, 'api_search_units', { p_text: q });
        return json({ data: body }, 200, corsHeaders(origin));
      }

      // ---- PUBLIC: chi tiết tin ------------------------------------------
      if (path.startsWith('/api/listings/') && request.method === 'GET') {
        const slug = path.split('/').pop();
        const body = await callRest(env, '/rest/v1/listing_cards',
          `slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`);
        const data = body[0];
        if (!data) return json({ error: 'Not found' }, 404, corsHeaders(origin));

        // ✅ CỐ TÌNH KHÔNG trả address_line ở đây.
        //    Địa chỉ đầy đủ chỉ lấy qua /api/contact/reveal (cần đăng nhập).
        delete data.address_line;

        // có đăng nhập không → client tự quyết định có hiện nút "Xem SĐT" hay không
        const user = await getUser(request, env);

        return json({
          data,
          can_reveal: !!user,   // cờ hiển thị, KHÔNG phải quyền truy cập dữ liệu
        }, 200, corsHeaders(origin));
      }

      // ---- PUBLIC: danh sách dự án --------------------------------------
      if (path === '/api/projects' && request.method === 'GET') {
        return withCache(request, ctx, env, corsHeaders(origin), async () => {
          const q = url.searchParams.get('q');
          const body = await callRest(env, '/rest/v1/projects',
            `select=id,slug,name,address,lat,lng,amenities,hero_image,gallery,building_count`
            + `&is_published=eq.true&limit=60`
            + (q ? `&name=ilike.*${encodeURIComponent(q)}*` : ''));
          return json({ data: body }, 200, corsHeaders(origin));
        });
      }

      // ---- PUBLIC: đơn vị hành chính (cache 1 ngày) ----------------------
      if (path === '/api/admin-units' && request.method === 'GET') {
        return withCache(request, ctx, env, corsHeaders(origin), async () => {
          const districts = await callRest(env, '/rest/v1/admin_districts',
            'select=id,code,slug,name_new,name_old,type,sort_order,lat,lng&is_active=eq.true&order=sort_order');
          const wards = await callRest(env, '/rest/v1/admin_wards',
            'select=id,district_id,code,slug,name_new&is_active=eq.true&order=name_new');
          return json({ districts, wards }, 200, corsHeaders(origin));
        });
      }

      // ---- ⭐ NHẠY CẢM: xem số điện thoại -------------------------------
      //  Bắt buộc: đăng nhập + Turnstile
      if (path === '/api/contact/reveal' && request.method === 'POST') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Vui lòng đăng nhập' }, 401, corsHeaders(origin));

        // Turnstile
        const ts = request.headers.get('X-Turnstile-Token');
        if (!ts || !(await verifyTurnstile(ts, ip, env))) {
          ctx.waitUntil(logAlert(env, 'bot_detected', 'high', { reason: 'turnstile', path }));
          return json({ error: 'Xác minh người dùng thất bại' }, 403, corsHeaders(origin));
        }

        const { listingId } = await request.json().catch(() => ({}));

        // gọi RPC bằng TOKEN CỦA USER (không phải service_role) để
        // auth.uid() trong SQL resolve đúng người đang xem
        const body = await callRpc(env, 'reveal_contact',
          { p_listing_id: listingId, p_ip_hash: fp, p_user_agent: ua },
          request.headers.get('Authorization'));

        const data = body[0];
        if (!data) return json({ error: 'Không tìm thấy thông tin liên hệ' }, 404, corsHeaders(origin));

        return json({ data }, 200, corsHeaders(origin));
      }

      // ---- PUBLIC: gửi yêu cầu liên hệ (không cần đăng nhập) ---------
      if (path === '/api/leads' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const name = String(body.full_name || '').trim();
        const phone = String(body.phone || '').trim();

        if (name.length < 2 || !/^0\d{9,10}$/.test(phone)) {
          return json({ error: 'Thiếu họ tên hoặc số điện thoại không hợp lệ' },
            400, corsHeaders(origin));
        }
        if (String(body.message || '').length > 4000) {
          return json({ error: 'Nội dung quá dài' }, 400, corsHeaders(origin));
        }

        const row = await callRest(env, '/rest/v1/leads', '', null, 'POST', JSON.stringify({
          full_name: name.slice(0, 120),
          phone: phone.slice(0, 20),
          email: body.email ? String(body.email).slice(0, 200) : null,
          message: body.message ? String(body.message).slice(0, 4000) : null,
          listing_id: body.listing_id || null,
          source: body.source || 'contact_form',
          ip_hash: fp,
          user_agent: ua.slice(0, 300),
        }));

        return json({ data: { id: row[0]?.id } }, 201, corsHeaders(origin));
      }

      // ---- ẢNH: signed URL có hạn ---------------------------------------
      if (path.startsWith('/img/') && request.method === 'GET') {
        const key = path.slice(5);
        const url2 = await signImage(env, key, 3600);
        if (url2) {
          ctx.waitUntil(logAlert(env, 'image_access', 'low', { key }));
          return Response.redirect(url2, 302);
        }
        return new Response('Not found', { status: 404 });
      }

      // ---- ADMIN: thống kê (view admin_stats, quyền do RLS quyết định) ----
      if (path === '/api/admin/stats' && request.method === 'GET') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401, corsHeaders(origin));
        const body = await callRpc(env, 'api_admin_stats', {}, request.headers.get('Authorization'));
        return json({ data: body[0] || {} }, 200, corsHeaders(origin));
      }

      // ---- ADMIN: tạo tin mới ----
      //  Ghi bảng listings VÀ listing_contacts (PII tách riêng, chỉ Worker chạm được).
      //  Không dùng transaction qua REST — dùng hàm RPC để đảm bảo cả hai cùng thành công.
      if (path === '/api/admin/listings' && request.method === 'POST') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401, corsHeaders(origin));
        const auth = request.headers.get('Authorization');

        const payload = await request.json().catch(() => ({}));
        const body = await callRpc(env, 'api_create_listing', {
          p_payload: payload,
        }, auth);

        return json({ data: body[0] || null }, 200, corsHeaders(origin));
      }

      // ---- ADMIN: danh sách tin (có phân trang + lọc) ----
      if (path === '/api/admin/listings' && request.method === 'GET') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401, corsHeaders(origin));

        const auth = request.headers.get('Authorization');
        const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
        const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page')) || 25));
        const off = (page - 1) * perPage;

        let flt = 'status=eq.pending';
        const st = url.searchParams.get('status');
        if (st) flt = `status=eq.${encodeURIComponent(st)}`;
        const dist = url.searchParams.get('district');
        if (dist) flt += `&district_id=eq.${encodeURIComponent(dist)}`;
        const kw = url.searchParams.get('q');
        if (kw) flt += `&title=ilike.*${encodeURIComponent(kw)}*`;

        const cols = 'id,reference_code,slug,title,type,price,price_unit,status,area,' +
                     'bedrooms,view_count,created_at,agent_id,district_id,ward_id,project_id';

        // đếm tổng — dùng Prefer: count=exact
        const cntRes = await fetch(
          `${env.SB_URL}/rest/v1/listings?${flt}&select=id`,
          { headers: { apikey: env.SB_SERVICE_KEY, Authorization: auth, Prefer: 'count=exact' } });
        const total = Number(cntRes.headers.get('content-range')?.split('/')[1] ?? 0);

        const items = await callRest(env, '/rest/v1/listings',
          `${flt}&select=${cols}&order=created_at.desc&limit=${perPage}&offset=${off}`, auth);

        return json({ data: { items, total, page, per_page: perPage } }, 200, corsHeaders(origin));
      }

      // ---- ADMIN: sửa / xoá tin ----
      const mList = path.match(/^\/api\/admin\/listings\/([0-9a-f-]{36})$/);
      if (mList && (request.method === 'PATCH' || request.method === 'DELETE')) {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401, corsHeaders(origin));
        const id = mList[1];
        const auth = request.headers.get('Authorization');

        if (request.method === 'DELETE') {
          await callRest(env, `/rest/v1/listings?id=eq.${id}`, '', auth, 'DELETE');
          return json({ data: { ok: true } }, 200, corsHeaders(origin));
        }

        const patch = await request.json().catch(() => ({}));
        // Chỉ cho phép sửa các cột an toàn — KHÔNG cho tự đổi agent_id/priority
        const ALLOWED = ['title', 'description', 'price', 'area', 'bedrooms', 'bathrooms',
                         'floors', 'floor_number', 'direction', 'furniture', 'features',
                         'images', 'status', 'is_sponsored', 'published_at', 'expires_at',
                         'project_id', 'tower_name', 'ward_id', 'district_id', 'street_id'];
        const clean = Object.fromEntries(
          Object.entries(patch).filter(([k]) => ALLOWED.includes(k)));
        if (Object.keys(clean).length === 0) {
          return json({ error: 'Không có trường nào được cập nhật' }, 400, corsHeaders(origin));
        }

        // Gọi bằng TOKEN CỦA USER → RLS tự lọc "chỉ sửa được tin của mình"
        const body = await callRest(env, `/rest/v1/listings?id=eq.${id}`, '', auth,
          'PATCH', JSON.stringify(clean));

        return json({ data: body[0] || null }, 200, corsHeaders(origin));
      }

      // ---- ADMIN: đơn vị hành chính (danh mục) ----
      if (path === '/api/admin/admin-units' && request.method === 'GET') {
        const auth = request.headers.get('Authorization');
        const all = url.searchParams.get('include_inactive') === 'true';
        const filter = all ? '' : '&is_active=eq.true';
        const districts = await callRest(env, '/rest/v1/admin_districts',
          `select=id,code,slug,name_new,name_old,type,sort_order,aliases,verified,is_active${filter}
           &order=sort_order`, auth);
        const wards = await callRest(env, '/rest/v1/admin_wards',
          `select=id,district_id,code,slug,name_new,name_old,is_active${filter}
           &order=name_new`, auth);
        return json({ data: { districts, wards } }, 200, corsHeaders(origin));
      }

      // ---- ADMIN: tài khoản — nối profile với email trong auth.users ----
      //  auth.users không đọc được bằng anon/service key qua REST, nên
      //  dùng hàm RPC chạy cùng schema postgres.
      if (path === '/api/admin/users' && (request.method === 'GET' || request.method === 'PATCH')) {
        const auth = request.headers.get('Authorization');
        if (request.method === 'GET') {
          const p = new URLSearchParams(url.search);
          if (!p.get('limit')) p.set('limit', '100');
          p.set('order', 'created_at.desc');
          const users = await callRpc(env, 'api_admin_users', {
            p_filter: url.searchParams.get('role')
              ? `role=eq.${url.searchParams.get('role')}`
              : (url.searchParams.get('or') || ''),
          }, auth);
          return json({ data: users }, 200, corsHeaders(origin));
        }
        // PATCH: chỉ role / agency / is_verified / commission_rate
        const body = await request.json().catch(() => ({}));
        const ALLOWED = ['role', 'agency', 'agency_role', 'is_verified', 'commission_rate'];
        const clean = Object.fromEntries(
          Object.entries(body).filter(([k]) => ALLOWED.includes(k)));
        if (!Object.keys(clean).length) {
          return json({ error: 'Không có trường nào được cập nhật' }, 400, corsHeaders(origin));
        }
        const id = url.searchParams.get('id');
        const rows = await callRest(env, '/rest/v1/profiles', `id=eq.${id}`, auth, 'PATCH',
          JSON.stringify(clean));
        return json({ data: rows[0] || null }, 200, corsHeaders(origin));
      }

      // ---- ADMIN: yêu cầu liên hệ ----
      if (path === '/api/admin/leads' && (request.method === 'GET' || request.method === 'PATCH')) {
        const auth = request.headers.get('Authorization');
        if (request.method === 'GET') {
          const p = url.searchParams.get('status');
          const rows = await callRest(env, '/rest/v1/leads',
            `${p ? `status=eq.${p}&` : ''}order=created_at.desc&limit=100`, auth);
          return json({ data: rows }, 200, corsHeaders(origin));
        }
        const id = url.searchParams.get('id');
        const body = await request.json().catch(() => ({}));
        const clean = Object.fromEntries(
          Object.entries(body).filter(([k]) =>
            ['status', 'agent_id', 'note'].includes(k)));
        if (!Object.keys(clean).length) {
          return json({ error: 'Không có trường nào được cập nhật' }, 400, corsHeaders(origin));
        }
        const rows = await callRest(env, '/rest/v1/leads', `id=eq.${id}`, auth, 'PATCH',
          JSON.stringify(clean));
        return json({ data: rows[0] || null }, 200, corsHeaders(origin));
      }

      // ---- ADMIN: phần còn lại proxy thẳng sang bảng tương ứng ----
      if (path.startsWith('/api/admin')) {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401, corsHeaders(origin));
        // phân quyền chi tiết do database thực thi qua RLS
        const body = await callRest(env, '/rest/v1/' + path.replace('/api/admin/', ''),
          new URL(request.url).search, request.headers.get('Authorization'), request.method,
          request.method === 'GET' || request.method === 'DELETE' ? null : await request.text());
        return json({ data: body }, 200, corsHeaders(origin));
      }

      return json({ error: 'Not found' }, 404, corsHeaders(origin));

    } catch (e) {
      ctx.waitUntil(logAlert(env, 'error', 'medium', { path, msg: String(e).slice(0, 300) }));
      return json({ error: 'Server error' }, 500, corsHeaders(origin));
    }
  },
};

/* =============================================================================
 *  HÀM PHỤ
 * ========================================================================== */

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/** Fingerprint: HMAC(ip + ua). Lưu bản băm, KHÔNG lưu IP gốc (GDPR/NĐ13) */
async function fingerprint(ip, ua, env) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.FP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key,
    new TextEncoder().encode(ip + '|' + ua.slice(0, 120)));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/** Token bucket đơn giản trên KV */
async function rateLimit(fp, { n, win }, env) {
  if (!env.KV) return { ok: true };
  const k = `rl:${fp}:${Math.floor(Date.now() / 1000 / win)}`;
  const cur = Number(await env.KV.get(k)) || 0;
  if (cur >= n) return { ok: false, count: cur, retryAfter: win };
  await env.KV.put(k, String(cur + 1), { expirationTtl: win * 2 });
  return { ok: true, count: cur + 1 };
}

/** Verify Cloudflare Turnstile */
async function verifyTurnstile(token, ip, env) {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  const j = await res.json().catch(() => ({}));
  return j.success === true;
}

/** Verify Supabase JWT (HS256) — trả về user hoặc null */
async function getUser(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const [h, p, sig] = token.split('.').map(s => base64urlToBytes(s));
    const key = await crypto.subtle.importKey(
      'raw', base64urlToBytes(env.SB_JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, sig, h + '.' + p);
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(p));
    const now = Math.floor(Date.now() / 1000);
    return (payload.exp > now) ? payload : null;
  } catch { return null; }
}

/** Gọi RPC của Supabase */
async function callRpc(env, fn, args, authHeader = null) {
  const res = await fetch(`${env.SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SB_SERVICE_KEY,          // chỉ tồn tại ở server
      Authorization: authHeader || `Bearer ${env.SB_SERVICE_KEY}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`RPC ${fn}: ${res.status} ${txt.slice(0, 200)}`);
  }
  return res.json();
}

/** Gọi REST của Supabase */
async function callRest(env, table, query, auth = null, method = 'GET', body = null) {
  const res = await fetch(`${env.SB_URL}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    method,
    headers: {
      apikey: env.SB_SERVICE_KEY,
      Authorization: auth || `Bearer ${env.SB_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? body : undefined,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`REST ${table}: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

/** Cache GET ở CDN */
async function withCache(request, ctx, env, headers, produce) {
  const res = await produce();
  const body = await res.text();
  const ttl = 120;
  if (res.ok) {
    ctx.waitUntil(env.CACHE.put(request, new Response(body, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` },
    })));
  }
  return new Response(body, { status: res.status, headers: { ...headers, 'Cache-Control': `public, max-age=${ttl}` } });
}

/** Signed URL cho ảnh R2 — hết hạn sau `ttl` giây */
async function signImage(env, key, ttl = 3600) {
  if (!env.IMAGES || !env.R2_KEY_ID || !env.R2_SECRET) return null;
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const sig = await r2Sign(env, key, expires);
  const base = env.IMAGE_BASE_URL.replace(/^r2\//, '');
  return `${base}/${key}?exp=${expires}&sig=${sig}`;
}

/** Ghi cảnh báo vào DB (fire-and-forget) */
async function logAlert(env, type, severity, detail) {
  try {
    await fetch(`${env.SB_URL}/rest/v1/access_alerts`, {
      method: 'POST',
      headers: { apikey: env.SB_SERVICE_KEY, Authorization: `Bearer ${env.SB_SERVICE_KEY}`,
                 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_type: type, severity, detail }),
    });
  } catch { /* im lặng, không được làm hỏng request chính */ }
}

/* ---- tiện ích ---- */
const base64urlToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function r2Sign(env, key, expires) {
  const data = `URL path is: /${key}${env.IMAGE_BASE_URL.startsWith('r2:') ? '/' : ''}`;
  // R2 dùng thuật toán SigV4 — đơn giản hoá: dùng presigned URL chính thức.
  // TODO: thay bằng @cloudflare/workers-types nếu cần HMAC-SHA256 đầy đủ.
  return crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(key + expires + env.R2_SECRET))
    .then(b => [...new Uint8Array(b)].slice(0, 16)
      .map(x => x.toString(16).padStart(2, '0')).join(''));
}