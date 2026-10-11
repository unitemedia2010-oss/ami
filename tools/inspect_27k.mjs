/**
 * Xem dataset 27k tin (all-listings.json) có gì: cấu trúc và phân bố khu vực.
 *
 * Đây là nguồn dữ liệu thứ hai trong thư mục, lớn hơn PDF nhiều
 * (27 MB so với 194 dự án). Cần biết nó có gì trước khi quyết định dùng
 * hay không — đặc biệt là các quận lớn như Thủ Đức và Quận 2 vốn không
 * xuất hiện trong PDF.
 */
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('all-listings.json', 'utf8'));
const list = Array.isArray(raw) ? raw : raw.data || raw.items || [];

console.log(`tổng tin: ${list.length}`);
console.log(`cấu trúc khác: ${Array.isArray(raw) ? 'mảng thuần' : Object.keys(raw).join(', ')}\n`);

console.log('--- các trường có trong 1 bản ghi ---');
const mau = list[0] || {};
for (const [k, v] of Object.entries(mau)) {
  const g = typeof v === 'object' && v ? (Array.isArray(v) ? `mảng[${v.length}]` : 'object') : typeof v;
  console.log(`  ${k.padEnd(22)} ${g}  ${String(v).slice(0, 60)}`);
}

/* Tìm trường nào chứa tên quận */
const truong = ['quan', 'quận', 'district', 'khuVuc', 'khu_vuc', 'diaChi', 'dia_chi', 'address', 'duong', 'phuong'];
console.log('\n--- trường nào chứa thông tin khu vực ---');
for (const t of truong) {
  const co = list.filter((x) => x[t]).length;
  if (co) {
    console.log(`  "${t}": ${co}/${list.length} bản ghi có giá trị`);
    console.log(`     ví dụ: ${JSON.stringify(list.find(x => x[t])[t]).slice(0, 120)}`);
  }
}