/**
 * =============================================================================
 *  MOCK API — chạy khi phát triển, chưa cần Supabase.
 *
 *  Cùng dữ liệu với bản JSON tĩnh dùng cho GitHub Pages:
 *    • Phát triển  → chạy file này, có đủ route và phản hồi như API thật
 *    • Deploy Pages→ frontend đọc thẳng file JSON, không qua server này
 *
 *  Vì sao gộp chung một cổng với file tĩnh:
 *    Môi trường dev chặn kết nối chéo port (ERR_TUNNEL_CONNECTION_FAILED) và
 *    CORS giữa 4173 ↔ 8787 dễ vướng. Đặt API và website CÙNG ORIGIN thì khỏi
 *    CORS. Khi deploy thật, Worker và website vẫn khác origin như thiết kế.
 *
 *  Chạy:  node workers/mock/server.mjs
 * ============================================================================= */

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

import { buildDataset, findDistricts, fold } from './dataset.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = 8787;
const WEB_OUT = join(HERE, '../../web/out');
/** Tiền tố mà bản build dùng — đặt cùng giá trị với lúc build web/ */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

const { districts, projects, listings, mapProjects } = buildDataset();

/* =============================================================================
 *  Phục vụ file tĩnh
 * ========================================================================== */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

function serveStatic(res, pathname) {
  if (!existsSync(WEB_OUT)) return false;
  // chặn path traversal
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let file = join(WEB_OUT, safe);
  if (!file.startsWith(WEB_OUT)) return false;

  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) {
    // static export dùng thư mục: /tim-kiem → /tim-kiem/index.html
    const alt = join(WEB_OUT, safe.replace(/\/$/, ''), 'index.html');
    if (!existsSync(alt)) return false;
    file = alt;
  }

  const ext = extname(file).toLowerCase();
  /* File dữ liệu tĩnh: KHÔNG cho cache khi đang phát triển. Trình duyệt đang
     dùng cache: 'force-cache' (đúng cho GitHub Pages), nên nếu cổng này gửi
     max-age dài, mỗi lần sinh lại listings.json bạn vẫn thấy dữ liệu cũ và
     tưởng code bị lỗi. max-age=0 buộc trình duyệt hỏi lại mỗi lần tải trang. */
  const isData = pathname.endsWith('.json');
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' || isData
      ? 'no-cache'
      : 'public, max-age=3600',
  });
  res.end(readFileSync(file));
  return true;
}

/* =============================================================================
 *  Tiện ích
 * ========================================================================== */
const json = (res, data, status = 200) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Turnstile-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(data));
};

const SORTS = {
  newest: (a, b) => b.published_at.localeCompare(a.published_at),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  popular: (a, b) => b.view_count_7d - a.view_count_7d,
};

/* =============================================================================
 *  Định tuyến
 * ========================================================================== */
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  /* Bản build cho GitHub Pages có tiền tố /ami (xem web/next.config.mjs).
     Cỏng này cởi tiền tố đó ra để kiểm tra ĐÚNG bản sẽ deploy, thay vì
     phải build riêng một bản không tiền tố rồi lại build lần nữa. */
  let p = url.pathname;
  if (p === '/ami' || p.startsWith('/ami/')) p = p.slice(4) || '/';

  const q = url.searchParams;

  if (req.method === 'OPTIONS') return json(res, {});
  if (p.startsWith('/api/') === false && serveStatic(res, p)) return;

  /* ------------------------------------------------------------ danh sách */
  if (p === '/api/listings') {
    const kw = q.get('q');
    const page = Math.max(1, Number(q.get('page')) || 1);
    const perPage = Math.min(60, Math.max(1, Number(q.get('per_page')) || 24));
    const sort = SORTS[q.get('sort')] ? q.get('sort') : 'newest';

    let rows = listings;

    // ƯU TIÊN nhận diện QUẬN (hỗ trợ tên cũ/viết tắt), sau đó mới tìm theo tên
    if (kw && kw.trim()) {
      const hits = findDistricts(districts, kw.trim());
      if (hits.length) {
        const ids = new Set(hits.map((d) => d.id));
        rows = rows.filter((l) => ids.has(l.district_id));
      } else {
        const f = fold(kw);
        rows = rows.filter((l) =>
          fold(l.title).includes(f)
          || fold(l.project_name).includes(f)
          || fold(l.district_name).includes(f));
      }
    }

    if (q.get('type')) rows = rows.filter((l) => l.type === q.get('type'));
    if (q.get('project')) rows = rows.filter((l) => l.project_id === q.get('project'));
    if (q.get('bedrooms')) rows = rows.filter((l) => l.bedrooms >= Number(q.get('bedrooms')));
    if (q.get('min')) rows = rows.filter((l) => l.price >= Number(q.get('min')));
    if (q.get('max')) rows = rows.filter((l) => l.price <= Number(q.get('max')));
    if (q.get('district')) rows = rows.filter((l) => l.district_id === Number(q.get('district')));

    rows = [...rows].sort(SORTS[sort]);

    return json(res, {
      total: rows.length, page, per_page: perPage,
      data: rows.slice((page - 1) * perPage, page * perPage),
    });
  }

  /* -------------------------------------------------------------- chi tiết */
  if (p.startsWith('/api/listings/')) {
    const slug = decodeURIComponent(p.slice('/api/listings/'.length));
    const l = listings.find((x) => x.slug === slug);
    if (!l) return json(res, { error: 'Not found' }, 404);
    return json(res, { data: l, can_reveal: true });
  }

  /* --------------------------------------------------- tìm đơn vị hành chính */
  if (p === '/api/search-units') {
    const kw = fold(q.get('q'));
    if (!kw) return json(res, { data: [] });
    return json(res, {
      data: findDistricts(districts, kw).map((d) => ({
        kind: 'district', id: d.id, name: d.name_new, slug: d.slug, district_id: null,
      })),
    });
  }

  /* ------------------------------------------------------------------ dự án */
  if (p === '/api/projects') {
    const kw = q.get('q');
    let rows = projects;
    if (kw) rows = rows.filter((x) => fold(x.name).includes(fold(kw)));
    return json(res, { data: rows.slice(0, 60) });
  }

  /* ---------------------------------------------------------------- bản đồ */
  if (p === '/api/map/projects') {
    const kw = q.get('q');
    const did = q.get('district');
    let rows = mapProjects;
    if (did) {
      const d = districts.find((x) => String(x.id) === String(did));
      if (d) rows = rows.filter((x) => x.district_name === d.name_new);
    }
    if (kw) rows = rows.filter((x) => fold(x.name).includes(fold(kw)));
    return json(res, { total: rows.length, data: rows.slice(0, 300) });
  }

  /* ------------------------------------------------------- đơn vị hành chính */
  if (p === '/api/admin-units' || p === '/api/admin/admin-units') {
    return json(res, { districts, wards: [] });
  }

  /* ------------------------------------------------------------ xem SĐT (giả) */
  if (p === '/api/contact/reveal') {
    let body = '';
    req.on('data', (c) => { body += c; });
    return req.on('end', () => {
      let id = '';
      try { id = JSON.parse(body || '{}').listingId ?? ''; } catch { /* body rác */ }
      const l = listings.find((x) => x.id === id);
      if (!l) return json(res, { error: 'Không tìm thấy tin' }, 404);
      const phone = `09${String(Math.floor(Math.random() * 900000000 + 100000000))}`;
      return json(res, {
        data: {
          contact_name: 'Nguyễn Minh Anh',
          phone_masked: `${phone.slice(0, 6)}•••${phone.slice(-2)}`,
          phone_full: phone,
          zalo: phone,
          full_address: `${l.tower_name}, ${l.project_name}, ${l.district_name ?? 'TP.HCM'}`,
          owner_name: 'Agent SGREALTY',
        },
      });
    });
  }

  /* ------------------------------------------------------------------ leads */
  if (p === '/api/leads' && req.method === 'POST') {
    return json(res, { data: { id: `lead-${Date.now()}` } }, 201);
  }

  /* ------------------------------------------------- admin (giả, đủ xem giao diện) */
  if (p.startsWith('/api/admin')) {
    if (p === '/api/admin/stats') {
      return json(res, { data: {
        published: listings.filter((l) => l.type === 'sell').length,
        pending: 12, expired: 5, projects: projects.length, agents: 34,
        new_leads: 7, reveals_24h: 41, open_alerts: 2, new_today: 3,
      } });
    }
    if (p === '/api/admin/leads') {
      return json(res, { data: [
        { id: 'l1', full_name: 'Trần Minh Quân', phone: '0901234567',
          email: 'quan.tran@gmail.com', source: 'contact_form', status: 'new',
          message: 'Cho em hỏi căn 2PN tại The Prive còn căn nào view sông không ạ?',
          listing_id: null, agent_id: null,
          created_at: new Date(Date.now() - 3600e3).toISOString() },
        { id: 'l2', full_name: 'Lê Thu Hà', phone: '0987654321',
          email: null, source: 'listing', status: 'contacted',
          message: 'Tôi muốn xem thực tế vào cuối tuần này.',
          listing_id: null, agent_id: null,
          created_at: new Date(Date.now() - 26 * 3600e3).toISOString() },
        { id: 'l3', full_name: 'Phạm Đức Duy', phone: '0912345678',
          email: 'duy.pham@yahoo.com', source: 'project', status: 'closed',
          message: 'Giá căn hộ 3 phòng tại Vinhomes Central Park hiện tại?',
          listing_id: null, agent_id: null,
          created_at: new Date(Date.now() - 3 * 86400e3).toISOString() },
      ] });
    }
    if (p === '/api/admin/access_alerts') {
      return json(res, { data: [
        { id: 1, alert_type: 'honeypot_hit', severity: 'high',
          ip_hash: 'a3f9c2b17e4d8a05f1c3b9e7d2a4f608',
          detail: { path: '/listing/all-export', ua: 'python-requests/2.31.0' },
          created_at: new Date(Date.now() - 900e3).toISOString(), resolved_at: null },
        { id: 2, alert_type: 'bot_detected', severity: 'medium',
          ip_hash: '7b1e4d9c8a6f2053b7c1d4e9f8a20635',
          detail: { reason: 'turnstile', ua: 'curl/8.4.0' },
          created_at: new Date(Date.now() - 4 * 3600e3).toISOString(), resolved_at: null },
        { id: 3, alert_type: 'rate_limit', severity: 'low',
          ip_hash: 'c9d2e5f1a8b74036d9e2c5a1b7f8e403',
          detail: { n: 241, path: '/api/listings' },
          created_at: new Date(Date.now() - 26 * 3600e3).toISOString(), resolved_at: null },
      ] });
    }
    if (p === '/api/admin/users') {
      return json(res, { data: [
        { id: 'u1', email: 'admin@sgrealty.vn', full_name: 'Quản trị viên',
          phone: '0900000001', role: 'super_admin', agency: 'SGREALTY',
          commission_rate: 0, is_verified: true,
          created_at: new Date(Date.now() - 200 * 86400e3).toISOString() },
        { id: 'u2', email: 'minh.an@sgrealty.vn', full_name: 'Nguyễn Minh Anh',
          phone: '0900000002', role: 'agent', agency: 'SGREALTY',
          commission_rate: 2.5, is_verified: true,
          created_at: new Date(Date.now() - 90 * 86400e3).toISOString() },
        { id: 'u3', email: 'thao.nguyen@gmail.com', full_name: 'Nguyễn Thảo',
          phone: '0900000003', role: 'agent', agency: null,
          commission_rate: 2, is_verified: false,
          created_at: new Date(Date.now() - 40 * 86400e3).toISOString() },
        { id: 'u4', email: 'khach@gmail.com', full_name: 'Hoàng Văn K',
          phone: null, role: 'customer', agency: null,
          commission_rate: 0, is_verified: false,
          created_at: new Date(Date.now() - 12 * 86400e3).toISOString() },
      ] });
    }
    if (p === '/api/admin/listings' && req.method === 'POST') return json(res, { data: {} }, 201);
    if (p.startsWith('/api/admin/listings') && req.method === 'GET') {
      const status = q.get('status');
      let rows = listings;
      if (status) rows = rows.filter((l) => l.type === status);
      return json(res, { data: { items: rows.slice(0, 25), total: rows.length, page: 1, per_page: 25 } });
    }
    if (p === '/api/admin/projects') return json(res, { data: projects });
    if (['PATCH', 'DELETE', 'POST'].includes(req.method)) return json(res, { data: {} });
  }

  if (serveStatic(res, p)) return;

  // đường dẫn lạ → trả TRANG 404 tĩnh; chỉ /api/ mới trả JSON
  if (!p.startsWith('/api/')) {
    const nf = join(WEB_OUT, '404.html');
    if (existsSync(nf)) {
      res.writeHead(404, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
      res.end(readFileSync(nf));
      return;
    }
  }
  json(res, { error: 'Not found', path: p }, 404);
});

server.listen(PORT, () => {
  console.log(`[mock] website + API : http://localhost:${PORT}`);
  console.log(`[mock] bản deploy    : http://localhost:${PORT}${BASE_PATH}/`);
  console.log(`[mock] dữ liệu       : ${listings.length} tin · ${projects.length} dự án`
    + ` · ${mapProjects.length} có toạ độ · ${districts.length} quận`);
});