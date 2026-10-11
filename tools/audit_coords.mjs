/**
 * Soát chất lượng toạ độ trước khi đưa lên bản đồ.
 *
 * Điểm cao chưa chắc đúng — Nominatim là dữ liệu cộng tác. Nhưng điểm THẤP
 * thì gần như chắc sai. Script này liệt kê 20 ca thấp nhất để mình soi tay,
 * kèm cảnh báo về các ca có dấu hiệu sai (cùng toạ độ bị dùng lại cho
 * nhiều tên khác nhau, hoặc lệch quá xa quận PDF khai báo).
 */
import { readFileSync } from 'node:fs';

const kq = JSON.parse(readFileSync('tools/projects-coords.json', 'utf8'));
const ok = Object.entries(kq).filter(([, v]) => v.ok);

/* ---- nhóm theo cặp toạ độ: nhiều tên khác nhau dùng chung một điểm là dấu
       hiệu mạnh của kết quả sai ---- */
const nhom = new Map();
for (const [n, v] of ok) {
  const k = `${v.lat},${v.lng}`;
  if (!nhom.has(k)) nhom.set(k, []);
  nhom.get(k).push([n, v]);
}
const trung = [...nhom.values()].filter((g) => g.length > 1);

/* ---- phân bố điểm ---- */
const diem = ok.map(([, v]) => v.diem).sort((a, b) => a - b);
const pct = (p) => diem[Math.floor(diem.length * p)];

console.log(`tổng: ${ok.length}/${Object.keys(kq).length} được định vị`);
console.log(`điểm — thấp nhất ${diem[0]}, p25 ${pct(0.25)}, trung vị ${pct(0.5)}, p75 ${pct(0.75)}, cao nhất ${diem[diem.length - 1]}\n`);

console.log(`=== 20 CA ĐIỂM THẤP NHẤT — soi tay trước ===`);
for (const [n, v] of ok.sort((a, b) => a[1].diem - b[1].diem).slice(0, 20)) {
  console.log(`\n[${v.diem}] ${n}`);
  console.log(`   ${v.lat}, ${v.lng} · lệch tâm quận ${v.cachQuanKm ?? '?'} km · nguồn ${v.nguon}`);
  console.log(`   OSM: ${v.osmt}`);
}

if (trung.length) {
  console.log(`\n\n=== ⚠ CẢNH BÁO: ${trung.length} nhóm dùng CHUNG toạ độ ===`);
  console.log('Mỗi dự án là một chung cư riêng. Trùng toạ độ thường do geocode');
  console.log('khớp cả nhóm vào cùng một công trình.\n');
  for (const g of trung) {
    console.log(`  ${g[0][1].lat}, ${g[0][1].lng}  (${g.length} tên)`);
    for (const [n, v] of g) console.log(`     · ${n}  [${v.nguon}, điểm ${v.diem}]`);
  }
} else {
  console.log('\n✓ Không có nhóm nào dùng chung toạ độ.');
}

/* ---- nhắc các tên rác trong dữ liệu PDF ---- */
const rac = ok.map(([n]) => n).filter((n) =>
  /chưa (tìm được|xác định|nhập|khoảng|đủ)|^[\d,\s]+[A-Za-zÀ-ỹ]|,\s*Q\.?\d|,\s*Tân Bình$|Tower$/i.test(n));
if (rac.length) {
  console.log(`\n\n=== ⚠ ${rac.length} tên trong PDF trông như rác (không phải tên dự án) ===`);
  for (const n of rac) console.log(`  ${n}`);
}