/** Đo kích thước nhiều cách biểu diễn, để quyết định chia file thế nào. */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const list = JSON.parse(readFileSync('all-listings.json', 'utf8'));

/* --- 1. đầy đủ, dạng object --- */
const day = list.map((x) => ({
  id: x.id, t: x.tieuDe, p: x.giaTrieu, ty: x.hinhThuc,
  a: x.loaiHinhNha, q: x.quan, w: x.phuong, d: x.duong,
  da: x.duAn, n: x.soPhongNgu, i: x.anh, ts: x.ngayDang,
}));
/* --- 2. rút gọn cho thẻ tin --- */
const the = list.map((x) => ({
  id: x.id, slug: x.slug, type: /cho thuê|thuê/i.test(x.hinhThuc) ? 'rent' : 'sell',
  title: x.tieuDe, price: x.giaTrieu, bedrooms: x.soPhongNgu || null,
  district_id: null, district_name: x.quan, ward_name: x.phuong,
  street: x.duong, project_name: x.duAn || null, category: x.loaiHinhNha,
  image: x.anh, published_at: x.ngayDang,
}));
/* --- 3. dạng mảng phẳng (ít byte nhất) --- */
const flat = list.map((x) => [
  x.id, x.tieuDe, x.giaTrieu, /cho thuê|thuê/i.test(x.hinhThuc) ? 1 : 0,
  x.soPhongNgu || 0, x.quan, x.phuong, x.anh || '',
]);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0);
const gz = (s) => (gzipSync(s).length / 1024).toFixed(0);

console.log(`tổng tin: ${list.length}\n`);
for (const [ten, data] of [['đầy đủ (object)', day], ['thẻ tin (object)', the], ['phẳng (mảng)', flat]]) {
  const s = JSON.stringify(data);
  console.log(`${ten.padEnd(18)} ${kb(s).padStart(7)} KB   nén gzip ${gz(s).padStart(6)} KB`);
}

/* --- 4. nếu chia theo quận --- */
console.log('\n=== nếu chia 22 file theo quận (dạng thẻ tin) ===');
const nhom = new Map();
for (const x of the) {
  const k = x.district_name || 'chua-ro';
  if (!nhom.has(k)) nhom.set(k, []);
  nhom.get(k).push(x);
}
let tongRaw = 0, tongGz = 0, lonNhat = 0;
for (const [k, v] of nhom) {
  const s = JSON.stringify(v);
  const g = gzipSync(s).length / 1024;
  tongRaw += Buffer.byteLength(s) / 1024;
  tongGz += g;
  lonNhat = Math.max(lonNhat, g);
  console.log(`  ${k.padEnd(24)} ${String(v.length).padStart(5)} tin  ${g.toFixed(0).padStart(5)} KB gzip`);
}
console.log(`\n  tổng ${tongRaw.toFixed(0)} KB · gzip ${tongGz.toFixed(0)} KB · file lớn nhất ${lonNhat.toFixed(0)} KB`);

/* --- 5. chi phí nén của GitHub Pages --- */
console.log(`\nGhi chú: GitHub Pages có nén gzip, người xem tải ${gz(JSON.stringify(the))} KB nếu gộp 1 file.`);
console.log(`         Chia theo quận thì tải trung bình ~${(tongGz / nhom.size).toFixed(0)} KB mỗi lần xem 1 khu vực.`);