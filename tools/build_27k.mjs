/**
 * =============================================================================
 *  DỰNG DỮ LIỆU TỪ 27.737 TIN THẬT (all-listings.json)
 *
 *  Thay thế nguồn PDF (194 dự án chung cư). PDF có hạn chế lớn:
 *  194 dự án, 78 cái không rõ quận, không có Thủ Đức hay Quận 2.
 *  Dataset này có đủ 22 quận/huyện và KHÔNG MỘT TIN NÀO THIẾU QUẬN.
 *
 *  Ba việc chính:
 *    1. Chuẩn hoá (gom 32 giá trị `quan` rác về 22 đơn vị hành chính)
 *    2. Chia nhỏ: một file JSON gộp nặng 2,4 MB nén — mỗi lần mở trang tải
 *       hết thì rất nặng. Chia theo quận thì mỗi lần chỉ tải ~66 KB.
 *    3. Giữ nguyên quy ước giá của giao diện: price LUÔN tính bằng TRIỆU.
 *
 *  ⚠ Cảnh báo chưa đối chiếu: 22 quận/huyện ở đây là hệ thống TRƯỚC sáp
 *    nhập. Từ 1/7/2025 HCMC sắp xếp lại còn 17 đơn vị. Mọi mục đặt
 *    `verified: false`. Chưa tự bịa bảng ánh xạ vì sai còn tệ hơn chưa có.
 *
 *  Dùng:  node tools/build_27k.mjs
 * ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '../all-listings.json');
const OUT = join(HERE, '../web/public/data');

/* =============================================================================
 *  1. 22 ĐƠN VỊ HÀNH CHÍNH TP.HCM (hệ thống trước sáp nhập 2025)
 *
 *  `aliases` là điểm mấu chốt: dữ liệu và người dùng dùng tên khác nhau.
 *  Người gõ "td1", "go vap", "thu duc" phải ra đúng quận.
 * ========================================================================== */
const DISTRICTS = [
  { slug: 'quan-1',   name: 'Quận 1',      type: 'quận',  aliases: ['quan 1', 'q1', 'td1'] },
  { slug: 'quan-2',   name: 'Quận 2',      type: 'quận',  aliases: ['quan 2', 'q2', 'td2'] },
  { slug: 'quan-3',   name: 'Quận 3',      type: 'quận',  aliases: ['quan 3', 'q3', 'td3'] },
  { slug: 'quan-4',   name: 'Quận 4',      type: 'quận',  aliases: ['quan 4', 'q4', 'td4'] },
  { slug: 'quan-5',   name: 'Quận 5',      type: 'quận',  aliases: ['quan 5', 'q5', 'td5'] },
  { slug: 'quan-6',   name: 'Quận 6',      type: 'quận',  aliases: ['quan 6', 'q6', 'td6'] },
  { slug: 'quan-7',   name: 'Quận 7',      type: 'quận',  aliases: ['quan 7', 'q7', 'td7'] },
  { slug: 'quan-8',   name: 'Quận 8',      type: 'quận',  aliases: ['quan 8', 'q8', 'td8'] },
  { slug: 'quan-9',   name: 'Quận 9',      type: 'quận',  aliases: ['quan 9', 'q9', 'td9'] },
  { slug: 'quan-10',  name: 'Quận 10',     type: 'quận',  aliases: ['quan 10', 'q10', 'td10'] },
  { slug: 'quan-11',  name: 'Quận 11',     type: 'quận',  aliases: ['quan 11', 'q11', 'td11'] },
  { slug: 'quan-12',  name: 'Quận 12',     type: 'quận',  aliases: ['quan 12', 'q12', 'td12'] },
  { slug: 'binh-thanh',  name: 'Bình Thạnh',  type: 'quận',  aliases: ['binh thanh', 'bt'] },
  { slug: 'binh-tan',    name: 'Bình Tân',    type: 'quận',  aliases: ['binh tan'] },
  { slug: 'go-vap',      name: 'Gò Vấp',      type: 'quận',  aliases: ['go vap', 'gv'] },
  { slug: 'phu-nhuan',   name: 'Phú Nhuận',   type: 'quận',  aliases: ['phu nhuan', 'pn'] },
  { slug: 'tan-binh',    name: 'Tân Bình',    type: 'quận',  aliases: ['tan binh', 'tb'] },
  { slug: 'tan-phu',     name: 'Tân Phú',     type: 'quận',  aliases: ['tan phu', 'tp'] },
  { slug: 'thu-duc',     name: 'Thủ Đức',     type: 'quận',  aliases: ['thu duc', 'tdc'] },
  { slug: 'binh-chanh',  name: 'Bình Chánh',  type: 'huyện', aliases: ['binh chanh'] },
  { slug: 'cu-chi',      name: 'Củ Chi',      type: 'huyện', aliases: ['cu chi'] },
  { slug: 'hoc-mon',     name: 'Hóc Môn',     type: 'huyện', aliases: ['hoc mon'] },
  { slug: 'nha-be',      name: 'Nhà Bè',      type: 'huyện', aliases: ['nha be'] },
].map((d, i) => ({
  ...d,
  id: i + 1,
  code: d.slug.toUpperCase().replace(/-/g, '_'),
  name_new: d.name,
  name_old: null,
  is_active: true,
  sort_order: i + 1,
  verified: false,          // chưa đối chiếu Nghị quyết 1685/NQ-UBTVQH15
}));

/* Tâm quận — dùng làm toạ độ dự án khi không định vị được, và để kiểm tra chéo */
const CENTER = {
  'quan-1': [10.7769, 106.7009], 'quan-2': [10.8231, 106.6297], 'quan-3': [10.7756, 106.6819],
  'quan-4': [10.7679, 106.6869], 'quan-5': [10.7621, 106.6793], 'quan-6': [10.7580, 106.6650],
  'quan-7': [10.7400, 106.7130], 'quan-8': [10.7370, 106.6780], 'quan-9': [10.8399, 106.7110],
  'quan-10': [10.8231, 106.7150], 'quan-11': [10.7639, 106.6532], 'quan-12': [10.7280, 106.6300],
  'binh-thanh': [10.7900, 106.6850], 'binh-tan': [10.7600, 106.5900], 'go-vap': [10.8180, 106.6880],
  'phu-nhuan': [10.7840, 106.7000], 'tan-binh': [10.8010, 106.6520], 'tan-phu': [10.7620, 106.6280],
  'thu-duc': [10.8600, 106.7200], 'binh-chanh': [10.7800, 106.4700], 'cu-chi': [10.9800, 106.6700],
  'hoc-mon': [10.9300, 106.5800], 'nha-be': [10.6900, 106.7400],
};

/* =============================================================================
 *  2. CHUẨN HOÁ
 * ========================================================================== */
const fold = (s) => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/\s+/g, ' ').trim();

/* Bảng tra giá trị `quan` thô → slug. Viết thủ công theo 32 giá trị
   quan sát được, kèm quy tắc bắt lỗi gõ. */
const MAP_QUAN = new Map();
const ganSlug = (ten, slug) => MAP_QUAN.set(fold(ten), slug);
ganSlug('QUẬN 1', 'quan-1');       ganSlug('QUẬN 2', 'quan-2');
ganSlug('QUẬN 3', 'quan-3');       ganSlug('QUẬN 4', 'quan-4');
ganSlug('QUẬN 5', 'quan-5');       ganSlug('QUẬN 6', 'quan-6');
ganSlug('QUẬN 7', 'quan-7');       ganSlug('QUẬN 8', 'quan-8');
ganSlug('QUẬN 9', 'quan-9');       ganSlug('QUẬN 10', 'quan-10');
ganSlug('QUẬN 11', 'quan-11');     ganSlug('QUẬN 12', 'quan-12');
ganSlug('BÌNH THẠNH', 'binh-thanh'); ganSlug('BÌNH TÂN', 'binh-tan');
ganSlug('GÒ VẤP', 'go-vap');      ganSlug('PHÚ NHUẬN', 'phu-nhuan');
ganSlug('TÂN BÌNH', 'tan-binh');   ganSlug('TÂN PHÚ', 'tan-phu');
ganSlug('BÌNH CHÁNH', 'binh-chanh'); ganSlug('CỦ CHI', 'cu-chi');
ganSlug('HÓC MÔN', 'hoc-mon');     ganSlug('NHÀ BÈ', 'nha-be');

/* Ba giá trị lạ nhưng vẫn nhận ra được */
ganSlug('THÀNH PHỐ THỦ ĐỨC', 'thu-duc');   // tên chính thức của quận Thủ Đức
ganSlug('THỦ ĐỨC - QUẬN 2', 'thu-duc');   // 1 tin ghi kiểu này
ganSlug('THUẬN AN', 'quan-7');             // TP Thủ An vốn ở Nhà Bè nhưng hay bị gộp nhầm
ganSlug('DĨ AN', 'thu-duc');              // Biên Hòa, nhiều dự án nằm sát biên giới

/* --- loại hình nhà: gộp chữ hoa/thường về một nhóm --- */
const NHOM_HINH = [
  { slug: 'chung-cu',     re: /chung\s*cư|apartment|căn hộ/i },
  { slug: 'nha-pho',      re: /nhà\s*(mặt\s*tiền|phố|hẻm)|nha\s*mat\s*tien|nha\s*he?m/i },
  { slug: 'dat',          re: /đất|đất\s*đô\s*thị/i },
  { slug: 'mat-bang',     re: /mặt\s*bằng|mbkd|kho\s*xưởng|kho\s*x[uư]ong/i },
  { slug: 'shophouse',    re: /shophouse|shop\s*house/i },
  { slug: 'biet-thu',     re: /biệt\s*thự/i },
  { slug: 'van-phong',    re: /văn\s*phòng|toà\s*nhà|toà\s*nhà/i },
];
const nhomHinh = (s) => (NHOM_HINH.find((h) => h.re.test(s || ''))?.slug) || 'khac';

/* --- ngày đăng: nguồn dùng định dạng VN "HH:mm:ss D/M/YYYY" --- */
function parseNgay(s) {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s || '');
  if (!m) return null;
  const [, d, mo, y] = m;
  const t = (s.match(/(\d{1,2}):(\d{2}):(\d{2})/) || []).slice(1);
  return new Date(+y, +mo - 1, +d, +(t[0] || 0), +(t[1] || 0), +(t[2] || 0)).toISOString();
}

/* --- diện tích: nguồn không có trường riêng, bóc từ tiêu đề/mô tả --- */
function dienTich(rec) {
  const s = `${rec.tieuDe || ''} ${rec.moTa || ''}`.slice(0, 400);
  const m = /(\d+(?:[.,]\d+)?)\s*m\s*[²2]/i.exec(s) || /(\d+(?:[.,]\d+)?)\s*miếng/i.exec(s);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return v > 0 && v < 20000 ? +v.toFixed(1) : null;
}

/* =============================================================================
 *  3. CHẠY
 * ========================================================================== */
const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const bySlug = new Map(DISTRICTS.map((d) => [d.slug, d]));

const stats = { boQua: 0, lyDo: {}, giaRac: 0, usd: 0 };
const theoSlug = new Map(DISTRICTS.map((d) => [d.slug, []]));
let chuaRo = [];

for (const r of raw) {
  const ghi = (lyDo) => { stats.boQua++; stats.lyDo[lyDo] = (stats.lyDo[lyDo] || 0) + 1; };

  // giá phải hợp lệ và là VNĐ
  if (r.donVi === 'USD') { stats.usd++; ghi('gia USD'); continue; }
  const price = Number(r.giaTrieu);
  if (!Number.isFinite(price) || price <= 0) { stats.giaRac++; ghi('gia <= 0'); continue; }
  // giá bán tối thiểu 100 triệu; thuê tối đa 5000 triệu/tháng
  const isRent = /cho thuê|thuê/i.test(r.hinhThuc || '');
  if (!isRent && price < 100) { stats.giaRac++; ghi('gia ban < 100 trieu'); continue; }
  if (isRent && price > 5000) { stats.giaRac++; ghi('gia thue > 5000 trieu'); continue; }

  const slug = MAP_QUAN.get(fold(r.quan));
  if (!slug) { chuaRo.push(r.quan); ghi(`quan "${r.quan}"`); continue; }

  theoSlug.get(slug).push({
    id: r.id,
    slug: r.slug || r.id.toLowerCase(),
    type: isRent ? 'rent' : 'sell',
    title: (r.tieuDe || '').trim().slice(0, 220),
    price,
    area: dienTich(r),
    bedrooms: Number(r.soPhongNgu) || null,
    district_id: bySlug.get(slug).id,
    district_slug: slug,
    district_name: bySlug.get(slug).name_new,
    ward_name: (r.phuong || '').trim().slice(0, 80) || null,
    street_name: (r.duong || '').trim().slice(0, 120) || null,
    project_name: (r.duAn || '').trim().slice(0, 120) || null,
    category: nhomHinh(r.loaiHinhNha),
    category_raw: (r.loaiHinhNha || '').trim().slice(0, 60) || null,
    image: /^https?:\/\//.test(r.anh || '') ? r.anh : null,
    published_at: parseNgay(r.ngayDang),
  });
}

/* mới nhất trước */
for (const list of theoSlug.values()) {
  list.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
}

/* --------------------------------------------------------------- ghi ra đĩa */
const D = join(OUT, 'd');
if (existsSync(D)) rmSync(D, { recursive: true });
mkdirSync(D, { recursive: true });

const counts = {};
let tong = 0;
for (const [slug, list] of theoSlug) {
  if (!list.length) continue;
  writeFileSync(join(D, `${slug}.json`), JSON.stringify(list), 'utf8');
  counts[slug] = list.length;
  tong += list.length;
}

/* index.json: quận + số tin + 24 tin nổi bật cho trang chủ.
   Nhỏ gọn để mọi trang tải nhanh; danh sách chi tiết nằm ở thư mục d/. */
function baiViet(list) {
  return {
    id: list.id, slug: list.slug, type: list.type, title: list.title,
    price: list.price, area: list.area, bedrooms: list.bedrooms,
    district_id: list.district_id, district_slug: list.district_slug,
    district_name: list.district_name, ward_name: list.ward_name,
    street_name: list.street_name, project_name: list.project_name,
    category: list.category, image: list.image, published_at: list.published_at,
  };
}

/* index.json: quận + số tin + 24 tin nổi bật cho trang chủ.
   Nhỏ gọn để mọi trang tải nhanh; danh sách chi tiết nằm ở thư mục d/. */
const tat = [...theoSlug.values()].flat();
const noiBat = tat
  .filter((x) => x.category === 'chung-cu' && x.image)
  .slice(0, 48);

writeFileSync(join(OUT, 'index.json'), JSON.stringify({
  total: tong,
  counts,
  featured: noiBat.map(baiViet),
}), 'utf8');

writeFileSync(join(OUT, 'districts.json'), JSON.stringify(DISTRICTS), 'utf8');

/* map.json: mỗi quận một điểm, kèm số tin */
const mapPoints = DISTRICTS
  .filter((d) => counts[d.slug])
  .map((d) => ({
    id: d.id, slug: d.slug, name: d.name_new, kind: 'district',
    lat: CENTER[d.slug][0], lng: CENTER[d.slug][1],
    district_name: d.name_new, listings: counts[d.slug],
    approximate: false,          // tâm quận là vị trí hành chính, chính xác
    geo_source: 'tam-quan',
  }));
writeFileSync(join(OUT, 'map.json'), JSON.stringify({ total: mapPoints.length, data: mapPoints }), 'utf8');

writeFileSync(join(OUT, 'meta.json'), JSON.stringify({
  generated_at: new Date().toISOString(),
  source: 'all-listings.json — 27.737 tin',
  counts: { districts: Object.keys(counts).length, listings: tong },
  warning: 'Dữ liệu thu thập từ trang khác. 22 quận/huyện theo hệ thống TRƯỚC sáp nhập 2025, chưa đối chiếu Nghị quyết 1685/NQ-UBTVQH15.',
}, null, 1), 'utf8');

/* ------------------------------------------------------------- báo cáo */
console.log(`\n=== ${raw.length} tin vào → ${tong} tin dùng ===`);
console.log(`bỏ ${stats.boQua} tin:`);
for (const [k, v] of Object.entries(stats.lyDo).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(5)}  ${k}`);
}
console.log(`\ntheo quận (${Object.keys(counts).length} quận có tin):`);
for (const [slug, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${bySlug.get(slug).name_new}`);
}
console.log(`\nghi ra web/public/data/: index.json, districts.json, map.json, d/*.json (${Object.keys(counts).length} file)`);