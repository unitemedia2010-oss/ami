/** Phân bố khu vực của 27k tin, tập trung vào Thủ Đức và Quận 2. */
import { readFileSync } from 'node:fs';

const list = JSON.parse(readFileSync('all-listings.json', 'utf8'));

/* --- phân bố quận --- */
const dist = new Map();
for (const x of list) {
  const k = (x.quan || '(trống)').trim().toUpperCase();
  dist.set(k, (dist.get(k) || 0) + 1);
}
const xep = [...dist].sort((a, b) => b[1] - a[1]);

console.log(`=== ${list.length} tin · ${dist.size} giá trị "quan" khác nhau ===\n`);
console.log('STT  Số tin    Tỉ lệ   Tên quận');
xep.forEach(([k, v], i) => {
  console.log(`${String(i + 1).padStart(3)}  ${String(v).padStart(7)}  ${(v / list.length * 100).toFixed(1).padStart(5)}%  ${k}`);
});

/* --- các từ khoá người dùng hay hỏi --- */
console.log('\n=== tìm theo từ khoá trong tên trường `quan` ===');
for (const kw of ['THỦ ĐỨC', 'THU DUC', 'QUẬN 2', 'QUAN 2', 'TP THỦ ĐỨC', 'QUẬN 9', 'QUẬN 7', 'BÌNH THẠNH']) {
  const n = xep.filter(([k]) => k.includes(k)).reduce((s, [, v]) => s + v, 0);
  console.log(`  "${kw}": ${n} tin`);
}

/* --- Thủ Đức có thật không? xem mẫu --- */
const td = list.filter((x) => (x.quan || '').toUpperCase().includes('THỦ ĐỨC'));
console.log(`\n=== mẫu 8 tin Thủ Đức (tổng ${td.length}) ===`);
for (const x of td.slice(0, 8)) {
  console.log(`  ${(x.quan || '').padEnd(18)} | ${(x.phuong || '').padEnd(26)} | ${x.giaHienThi}`);
  console.log(`     duong: ${x.duong || '(khong co)'} · duAn: ${x.duAn || '(khong co)'}`);
}

/* --- các từ khoá có thể là tên quận viết sai/khác cách --- */
const la = xep.filter(([k]) => /ĐỨC|QUẬN 2|QUAN 2|THỦ/i.test(k));
if (la.length) {
  console.log('\n=== các biến thể tên có thể là Thủ Đức / Quận 2 ===');
  for (const [k, v] of la) console.log(`  ${String(v).padStart(6)}  ${k}`);
}