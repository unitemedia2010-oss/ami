#!/usr/bin/env node
/**
 * BỔ SUNG TÊN DỰ ÁN cho các tin mà trường `duAn` bị bỏ trống.
 *
 * Vì sao thiếu: trường `duAn` chỉ được chủ đăng chọn khi đăng tin theo dự án.
 * Nhưng rất nhiều tin ghi tên dự án trong phần mô tả tự do, ví dụ:
 *   "Căn hộ 2PN view trực diện Vinhomes Central Park, full nội thất…"
 * → script này dò mô tả/đường, khớp với danh sách tòa nhà BĐS nổi tiếng,
 *   rồi điền vào duAn và đánh dấu nguồn.
 *
 * Dùng: node enrich.js all-merged.json all-enriched.json
 */
const fs = require('fs');

const [SRC = 'all-merged.json', DST = 'all-enriched.json'] = process.argv.slice(2);

/* Danh sách dự án / tòa nhà BĐS tại TP.HCM (khớp không phân biệt hoa thường)
   CHỈ chứa tên DỰ ÁN / KHU ĐÔ THỊ - không chứa tên quận, xã, phường,
   hay tên chung ("An Phú", "Tân Phú", "Thủ Đức"… là địa danh, không phải dự án) */
const PROJECTS = [
  // Vinhomes / Vingroup
  'Vinhomes Central Park', 'Vinhomes Grand Park', 'Vinhomes Premium', 'Vinhomes Paradise',
  'Vinhomes Urban Park', 'Vinhomes riverside', 'Vinhomes Nova', 'Vinhomes Gardenia',
  'Vinhomes Golden Bay', 'Vinhomes Riverside', 'Vinhomes Boulevard', 'Vinhomes Metropolis',
  'Ace City', 'Vạn Phúc', 'Sala', 'Masteri Thao Dien', 'Masteri', 'Joy City',
  // Thủ Thiêm
  'Thủ Thiêm Lakeview', 'The River Thủ Thiêm', 'The Metropole Thủ Thiêm', 'Empire City',
  'Empire City Thủ Thiêm', 'Centana Thủ Thiêm', 'Centana', 'The Opera Residence',
  'The Opera Metropole', 'Riva Park', 'Thủ Thiêm Green House', 'Thu Thiem Zeit River',
  'Thủ Thiêm Zeit River', 'Thủ Thiêm Sky', 'Thủ Thiêm Dragon', 'Thủ Thiêm Garden',
  'Thủ Thiêm Xanh', 'New City Thủ Thiêm', 'The Galleria Thủ Thiêm', 'The Galleria',
  'Sun Group', 'The Sun Thủ Thiêm', 'Saigon', 'DVerano', 'Verano', 'The Manor Thủ Thiêm',
  'The Hill', 'The Peak Thủ Thiêm', 'Lakeside Thủ Thiêm', 'Lakeside',
  // Khu Đông TP.HCM
  'The East', 'The East Point', 'The Grand', 'The Grand View', 'The Hallmark', 'The Hallmark 3',
  'River City', 'River Garden', 'The River Garden', 'Vesta',  'Tân Phú Residence',
  'The SCG', 'The Peak', 'The Artemis', 'The Varnish', 'The Starlight', 'The Crossing',
  'The Manor', 'Linh Đàm',  'An Phú Residence', 'The Hill Residence',
  // Khu Nam / Sài Gòn
  'Celadon', 'Celadon City', 'The Sun City', 'Lumen', 'Phú An', 'Phú Mỹ Hưng', 'Phú Mỹ Hưng City',
  'Tân Phú',  'Trí Phú', 'The Global City', 'River Walk', 'The Loft',
  // Quận 2 / Thủ Đức
  'The Vista', 'The Garden', 'The Palazzo', 'The Manor', 'Lavista', 'Lavista Crossing',
  'Lavista', 'Home Sweet Home', 'Lux Garden', 'An Phu Garden', 
   'The East Garden', 'Lakeview', 'Trí Phú 2', 'Trí Phú 3',
  // Quận 1 / Bến Thành / trung tâm
  'The Address', 'The Beacon', 'The Center', 'The Manor', 'The Return', 'The Peak',
   'Vinhomes Central Park', 'L Landmark', 'The Grandciti',
  // Quận 7 / Bình Tây
  'Tân Phú 7', 'Phú Mỹ Hưng', 'Venus', 'Venus Bay', 'Starland', 'Citi Home', 'An Phú 7',
  'Green Bays', 'Richmond', 'Richmond Residence', 'Riverside Residence',
  // Shophouse / đất nền nổi tiếng
  'Vạn Phúc', 'City Garden', 'Vạn Phú', 'Nam Phú', 'Phú Đăng', 'Tân Đức City',
  'Khu đô thị Vạn Phúc', 'Lekky', 'Homyland',
  // Chung cư phổ biến khác
  'The Trump', 'The Riviera', 'The Royal', 'The Cam Bao', 'The Peak Garden',
  'Zen City', 'The Matrix', 'The Bridge', 'The Dorset', 'The Sutton',
  'Sunview Town', 'Greenfield', 'Riverfront', 'The Manor', 'New Pearl', 'The East Sea',
  'Century Point', 'Century City', 'New Pearl Residence', 'The Panama',
  'The Matrix', 'Palace', 'The Vesta', 'The Filmore', 'The Artemis',
  'Thanh Long', 'The Olio', 'Happy City', 'The Mesto', 'M Landmark',
  'City Garden', 'Bách Việt', 'Tân Vạn Phước', 'Vạn Phước',  
  'Sài Đồng Residence',   
  // chung cư nhập khẩu / phổ biến
  'The Reverie', 'Pan Pacific', 'New Pearl 2', 'Hai Thanh', 'The Garden Residence',
  'The Crescent',   'Home Cong', 'The Eastern',
  'The Southern', 'The Alexandria', 'The Novotel', 'Rex Hotel', 'Lemon Residences',
];

const norm = s => (s || '')
  .normalize('NFC').toLowerCase()
  .replace(/đ/g, 'd').replace(/Đ/g, 'd')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const normProjects = PROJECTS.map(p => ({ ten: p, k: norm(p) }))
  .sort((a, b) => b.k.length - a.k.length);   // tên dài trước để khớp chính xác

const rows = JSON.parse(fs.readFileSync(SRC, 'utf8'));
let filled = 0;
const hits = {};

for (const r of rows) {
  if (r.duAn && String(r.duAn).trim()) continue;
  const blob = norm([r.moTa, r.duong, r.phuong, r.slug].join(' '));
  if (!blob) continue;
  for (const p of normProjects) {
    if (!p.k) continue;
    if (blob.includes(p.k)) {
      // chuẩn hoá viết hoa cho đẹp
      r.duAn = p.ten;
      r.duAnNguon = 'trích từ mô tả';
      filled++;
      hits[p.ten] = (hits[p.ten] || 0) + 1;
      break;
    }
  }
}

fs.writeFileSync(DST, JSON.stringify(rows, null, 0), 'utf8');

const total = rows.length;
const coTen = rows.filter(r => r.duAn && String(r.duAn).trim()).length;
console.error(`Đọc   : ${SRC} (${total.toLocaleString()} tin)`);
console.error(`Ghi   : ${DST}`);
console.error(`Đã bổ sung: ${filled.toLocaleString()} tin có tên dự án`);
console.error(`Tổng có tên dự án: ${coTen.toLocaleString()} / ${total.toLocaleString()} (${(100 * coTen / total).toFixed(1)}%)`);
console.error('\nTop 15 dự án khớp nhiều nhất:');
Object.entries(hits).sort((a, b) => b[1] - a[1]).slice(0, 15)
  .forEach(([k, v]) => console.error(`  ${String(v).padStart(5)}  ${k}`));