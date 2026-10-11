/**
 * Phân tích sâu dataset 27k trước khi đưa vào website.
 *
 * Điểm nhạy cảm nhất là GIÁ. Toàn bộ giao diện quy ước `price` LUÔN tính
 * bằng TRIỆU (xem web/src/lib/api.ts) — nếu dataset 27k dùng đơn vị khác
 * thì mọi phép lọc, so sánh và sắp xếp sẽ sai lệch theo đơn vị.
 * Nên phải soi kỹ trước.
 */
import { readFileSync } from 'node:fs';

const list = JSON.parse(readFileSync('all-listings.json', 'utf8'));

const dem = (k) => {
  const m = new Map();
  for (const x of list) {
    const v = String(x[k] ?? '').trim() || '(trống)';
    m.set(v, (m.get(v) || 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1]);
};

console.log('=== hinhThuc (loại giao dịch) ===');
for (const [v, n] of dem('hinhThuc')) console.log(`  ${String(n).padStart(6)}  ${v}`);

console.log('\n=== donVi (đơn vị tiền) ===');
for (const [v, n] of dem('donVi')) console.log(`  ${String(n).padStart(6)}  ${v}`);

console.log('\n=== giaHienThi: 12 mẫu mỗi loại giao dịch ===');
for (const ht of new Set(list.map((x) => x.hinhThuc))) {
  const m = list.filter((x) => x.hinhThuc === ht).slice(0, 6);
  console.log(`  [${ht}]`);
  for (const x of m) {
    console.log(`     giaTrieu=${String(x.giaTrieu).padStart(10)} giaTy=${String(x.giaTy).padStart(8)} hienThi="${x.giaHienThi}"`);
  }
}

console.log('\n=== KIỂM TRA GIA: giaTrieu có luôn là TRIỆU không? ===');
const thue = list.filter((x) => /cho thue/i.test(x.hinhThuc));
const ban = list.filter((x) => !/cho thue/i.test(x.hinhThuc));
const bpx = (a) => a.map((x) => x.giaTrieu).filter((v) => typeof v === 'number' && !Number.isNaN(v));
const tt = bpx(thue), tb = bpx(ban);
const minmax = (a) => a.length ? `${Math.min(...a).toLocaleString()} – ${Math.max(...a).toLocaleString()}` : 'không có';
console.log(`  Cho thuê: ${thue.length} tin · giaTrieu ${minmax(tt)} triệu/tháng`);
console.log(`  Mua bán : ${ban.length} tin · giaTrieu ${minmax(tb)} triệu`);
console.log(`  → cho thuê dưới 1000 triệu: ${tt.filter((v) => v < 1000).length}/${tt.length}`);
console.log(`  → bán dưới 1000 triệu      : ${tb.filter((v) => v < 1000).length}/${tb.length} (0 là đúng)`);

console.log('\n=== soPhongNgu ===');
for (const [v, n] of dem('soPhongNgu').slice(0, 10)) console.log(`  ${String(n).padStart(6)}  ${v}`);

console.log('\n=== loaiHinhNha: 20 giá trị phổ biến ===');
for (const [v, n] of dem('loaiHinhNha').slice(0, 20)) console.log(`  ${String(n).padStart(6)}  ${v}`);

console.log('\n=== ảnh ===');
const coAnh = list.filter((x) => /^https?:\/\//.test(x.anh || '')).length;
console.log(`  có URL ảnh: ${coAnh}/${list.length}`);
console.log(`  ví dụ: ${list.find((x) => x.anh)?.anh?.slice(0, 100)}`);

console.log('\n=== ngayDang (ngày đăng) ===');
console.log(`  ví dụ: ${JSON.stringify(list.slice(0, 3).map((x) => x.ngayDang))}`);

console.log('\n=== duAn (dự án) ===');
const coDA = list.filter((x) => (x.duAn || '').trim());
console.log(`  có tên dự án: ${coDA.length}/${list.length}`);
for (const [v, n] of dem('duAn').slice(0, 12)) console.log(`  ${String(n).padStart(6)}  ${v}`);