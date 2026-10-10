#!/usr/bin/env node
/**
 * ============================================================================
 *  SCRAPER khonhachinhchu.net  —  cào dữ liệu tin đăng bất động sản
 * ----------------------------------------------------------------------------
 *  Site này KHÔNG có robots.txt (request /robots.txt trả về trang HTML),
 *  dữ liệu lấy từ endpoint công khai:
 *      https://khonhachinhchu.as.r.appspot.com/api/search-listings?q=...&page=&per_page=
 *  Endpoint không yêu cầu đăng nhập / API key.
 *
 *  Cách dùng:
 *      node scrape.js --q="thủ thiêm" --maxpages=3
 *      node scrape.js --q="thủ thiêm,rạch chiếc" --type="Cho Thuê" --min=10 --max=100
 *      node scrape.js --q="*" --type="Cho Thuê" --page=1..5 --out=rent.json
 *      node scrape.js --q="thủ thiêm" --csv --delay=1200
 *
 *  Lưu ý đạo đức: chỉ nên dùng cho mục đích cá nhân / nghiên cứu thị trường.
 *  Script có delay mặc định giữa các request để không gây tải lên server.
 * ============================================================================
 */

const BASE = 'https://khonhachinhchu.as.r.appspot.com/api/search-listings';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/* ------------------------------- CLI ------------------------------------- */
const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const hit = argv.find(a => a.startsWith(`--${k}=`) || a === `--${k}`);
  if (!hit) return d;
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : true;
};
const OPTS = {
  q: arg('q', '*'),
  type: arg('type', ''),          // "Mua Bán" | "Cho Thuê"
  min: arg('min', ''),            // giá thấp nhất (cùng đơn vị với giá trả về)
  max: arg('max', ''),
  district: arg('district', ''),  // lọc theo quận (chứa trong chuỗi)
  perPage: parseInt(arg('perpage', '50'), 10),
  maxPages: parseInt(arg('maxpages', '5'), 10),
  delay: parseInt(arg('delay', '900'), 10),
  sort: arg('sort', 'postedAtTimestamp:desc'), // backend chỉ cho phép: postedAtTimestamp | gia
  csv: !!arg('csv', false),
  out: arg('out', ''),
  pretty: !!arg('pretty', false),
};

/* --------------------------- tiện ích ------------------------------------ */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.error('[scrape]', ...a);

/** "Cho Thuê" -> `hinhThucGiaoDich:=`Cho Thuê`` */
const esc = s => `'${String(s).replace(/'/g, "\\'")}'`;

function buildQuery() {
  let q = (OPTS.q && OPTS.q !== true) ? String(OPTS.q) : '*';
  const conds = [];

  if (OPTS.type) conds.push(`hinhThucGiaoDich:=${esc(OPTS.type)}`);
  if (OPTS.min !== '' && !Number.isNaN(Number(OPTS.min))) conds.push(`gia:>=${Number(OPTS.min)}`);
  if (OPTS.max !== '' && !Number.isNaN(Number(OPTS.max))) conds.push(`gia:<=${Number(OPTS.max)}`);
  if (OPTS.district) conds.push(`quan:=${esc(OPTS.district)}`);

  // từ khoá tiếng Việt có dấu: Typesense cần dạng "text \"từ khóa\""
  const textParts = q.split(',').map(s => s.trim()).filter(Boolean)
    .filter(s => /[a-zA-ZÀ-ỹ]/.test(s));
  if (q !== '*' && textParts.length) q = `${q} "${textParts.join(' ')}"`;

  if (conds.length) q += (q === '*' ? '' : ' && ') + conds.join(' && ');
  return q;
}

async function fetchPage(q, page) {
  const sort = (typeof OPTS.sort === 'string' && OPTS.sort) ? OPTS.sort : '';
  let url = `${BASE}?q=${encodeURIComponent(q)}&page=${page}&per_page=${OPTS.perPage}`;
  if (sort) url += `&sort_by=${encodeURIComponent(sort)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 45000);
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' }, signal: ctl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        // backend từ chối sort_by không hợp lệ (HTTP 500) -> thử lại không kèm sort
        if (res.status === 500 && sort) {
          log(`sort_by "${sort}" bị từ chối (HTTP 500) — bỏ sort, tiếp tục`);
          url = `${BASE}?q=${encodeURIComponent(q)}&page=${page}&per_page=${OPTS.perPage}`;
          const res2 = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' }, signal: ctl.signal });
          if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
          return await res2.json();
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw e;
      log(`lỗi (${e.message}), thử lại lần ${attempt + 1}…`);
      await sleep(1500 * attempt);
    }
  }
}

/** chuẩn hoá 1 tin về dạng phẳng, dễ đọc / dễ import Excel
 *  LƯU Ý: trường `gia` của site tính sẵn bằng TRIỆU đồng
 *    vd: 60 = 60 triệu/tháng (cho thuê) | 225000 = 225 tỷ (bán) */
function normalize(doc) {
  const giaTrieu = Number(doc.gia) || 0;
  let giaHienThi;
  if (giaTrieu >= 1000) giaHienThi = `${(giaTrieu / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  else                  giaHienThi = `${giaTrieu.toLocaleString('vi-VN')} triệu${doc.hinhThucGiaoDich === 'Cho Thuê' ? '/tháng' : ''}`;

  return {
    id: doc.id,
    tieuDe: (doc.moTa || '').slice(0, 120),
    giaTrieu: giaTrieu,                                   // số (triệu)
    giaTy: +(giaTrieu / 1000).toFixed(3),                  // số (tỷ)
    giaHienThi,
    donVi: doc.donViTienTe || '',
    hinhThuc: doc.hinhThucGiaoDich || '',
    loaiHinhNha: doc.loaiHinhNha || '',
    quan: doc.quan || '',
    phuong: doc.phuong || '',
    duong: doc.duong || '',
    duAn: doc.duan || '',
    soPhongNgu: doc.soPhongNgu ?? '',
    soTang: doc.sotang ?? '',
    moTa: doc.moTa || '',
    anh: doc.imageUrl || '',
    slug: doc.slug || '',
    nguon: doc.source_collection || '',
    ngayDang: doc.postedAtTimestamp
      ? new Date(doc.postedAtTimestamp * 1000).toLocaleString('vi-VN')
      : '',
    ngayDangISO: doc.postedAtTimestamp                       // ISO để sort/lọc trong Excel
      ? new Date(doc.postedAtTimestamp * 1000).toISOString()
      : '',
    link: doc.slug ? `https://khonhachinhchu.net/chi-tiet-tin/${doc.slug}` : '',
  };
}

/* ------------------------------ chạy ------------------------------------- */
(async () => {
  const query = buildQuery();
  log(`Truy vấn: ${query}`);
  log(`Trang 1..${OPTS.maxPages}, mỗi trang ${OPTS.perPage} tin, nghỉ ${OPTS.delay}ms`);

  const all = [];
  const seen = new Set();
  let total = null;

  for (let page = 1; page <= OPTS.maxPages; page++) {
    const data = await fetchPage(query, page);
    if (total === null) total = data.found ?? 0;

    const hits = data.hits || [];
    let added = 0;
    for (const h of hits) {
      const doc = h.document || h;
      if (!doc.id || seen.has(doc.id)) continue;   // chống trùng
      seen.add(doc.id);
      all.push(normalize(doc));
      added++;
    }

    log(`Trang ${page}: nhận ${hits.length} tin (mới ${added}) — tổng ${all.length}/${total}`);
    if (!hits.length || all.length >= total) break;
    await sleep(OPTS.delay);
  }

  /* ghi kết quả */
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const outFile = (typeof OPTS.out === 'string' && OPTS.out) ? OPTS.out : `listings-${stamp}.json`;

  if (OPTS.csv) {
    const cols = ['id', 'giaHienThi', 'hinhThuc', 'loaiHinhNha', 'quan', 'phuong', 'duong',
      'duAn', 'soPhongNgu', 'soTang', 'ngayDang', 'link'];
    const q2 = v => `"${String(v ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;
    const csv = '﻿' + [cols.join(','), ...all.map(r => cols.map(c => q2(r[c])).join(','))].join('\n');
    require('fs').writeFileSync(outFile.replace(/\.json$/, '.csv'), csv, 'utf8');
    log(`✔ Đã lưu CSV: ${outFile.replace(/\.json$/, '.csv')} (${all.length} dòng)`);
  }

  require('fs').writeFileSync(outFile, JSON.stringify(all, null, OPTS.pretty ? 2 : 0), 'utf8');
  log(`✔ Đã lưu JSON: ${outFile}`);
  log(`✔ Tổng cộng ${all.length} tin đăng.`);

  // thống kê nhanh
  const byHinhThuc = all.reduce((a, r) => (a[r.hinhThuc] = (a[r.hinhThuc] || 0) + 1, a), {});
  const byLoai = all.reduce((a, r) => (a[r.loaiHinhNha] = (a[r.loaiHinhNha] || 0) + 1, a), {});
  const gias = all.map(r => r.gia).filter(Boolean).sort((a, b) => a - b);
  log('Tỉ lệ:', byHinhThuc);
  log('Loại nhà:', byLoai);
  if (gias.length) {
    log(`Giá: thấp nhất ${gias[0].toLocaleString('vi-VN')} · trung vị ${gias[Math.floor(gias.length / 2)].toLocaleString('vi-VN')} · cao nhất ${gias.at(-1).toLocaleString('vi-VN')}`);
  }
})();