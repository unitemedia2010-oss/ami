/**
 * Kiểm tra dữ liệu bản đồ trước khi deploy.
 *
 * ⚠ Script cũ đọc map.json như một mảng, nhưng build_27k.mjs ghi kèm
 *   { total, data }. Chạy lên bản mới là `map.filter is not a function` —
 *   tức script KHÔNG hề chạy đúng từ lúc đổi cấu trúc, và CI vẫn xanh.
 *   Đây là dạng lỗi nguy hiểm nhất: công cụ tưởng là đang chặn, thực ra
 *   không chặn gì cả. Vì vậy bước này giờ chạy trong CI cùng các script
 *   soát khác, và có kiểm tra tương đối chặt (sai là exit 1).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(ROOT, 'web/public/data/map.json'), 'utf8'));

/** map.json có dạng { total, data } — chấp nhận cả mảng phẳng cho chắc. */
const map = Array.isArray(doc) ? doc : doc.data;
if (!Array.isArray(map)) {
  console.error('FAIL: map.json không phải mảng cũng không có trường "data"');
  process.exit(1);
}

const proj = JSON.parse(readFileSync(join(ROOT, 'web/public/data/projects.json'), 'utf8'));
const districts = JSON.parse(readFileSync(join(ROOT, 'web/public/data/districts.json'), 'utf8'));

const that = map.filter((p) => !p.approximate);
const uoc = map.filter((p) => p.approximate);

console.log(`tổng dự án      : ${proj.length}`);
console.log(`có toạ đồ      : ${map.length}`);
console.log(`  • toạ độ thật : ${that.length}`);
console.log(`  • tâm quận   : ${uoc.length}`);
console.log(`tỉ lệ toạ độ thật: ${((that.length / map.length) * 100).toFixed(0)}%`);

const theoNguon = {};
for (const p of that) theoNguon[p.geo_source] = (theoNguon[p.geo_source] || 0) + 1;
console.log('theo nguồn định vị:', JSON.stringify(theoNguon));

/* Bình bao TP.HCM — toạ độ lọt tỉnh khác là dữ liệu sai, không phải lỗi hiển thị. */
const BOX = { latMin: 10.30, latMax: 11.25, lngMin: 106.30, lngMax: 107.10 };
const raNgoai = map.filter((p) => p.lat < BOX.latMin || p.lat > BOX.latMax
  || p.lng < BOX.lngMin || p.lng > BOX.lngMax);

/* Trùng toạ độ: dự án không định vị được sẽ dồn vào tâm quận. Đó là hành vi
   đã chấp nhận (giao diện gắn nhãn "ước lượng theo quận"), nên chỉ cảnh báo. */
const nhom = new Map();
for (const p of map) {
  const k = `${p.lat},${p.lng}`;
  nhom.set(k, (nhom.get(k) || 0) + 1);
}
const trung = [...nhom.values()].filter((n) => n > 1);
console.log(`\nnhóm trùng toạ độ (tâm quận): ${trung.length}`
  + (trung.length ? ` — nhiều nhất ${Math.max(...trung)} dự án chung một điểm` : ''));

/* Mỗi quận phải có toạ độ tâm, nếu không bản đồ không vẽ được chấm tin so sánh. */
const thieuToaDo = districts.filter((d) => d.lat == null || d.lng == null);
console.log(`quận thiếu toạ độ tâm: ${thieuToaDo.length}`
  + (thieuToaDo.length ? ` (${thieuToaDo.map((d) => d.slug).join(', ')})` : ''));

const loi = [];
if (raNgoai.length) loi.push(`${raNgoai.length} marker nằm ngoài bình bao TP.HCM`);
if (thieuToaDo.length) loi.push(`${thieuToaDo.length} quận thiếu toạ độ tâm`);
if (map.length === 0) loi.push('bản đồ không có marker nào');
if (that.length === 0) loi.push('không có marker nào ở toạ độ thật');

if (raNgoai.length) {
  console.log('\nTOẠ ĐỘ NGOÀI TP.HCM:');
  for (const p of raNgoai) console.log(`  ${p.name}: ${p.lat}, ${p.lng}`);
}

if (loi.length) {
  console.error(`\nFAIL:\n  - ${loi.join('\n  - ')}`);
  process.exit(1);
}
console.log('\nOK: toạ độ hợp lệ, mọi quận có tâm để vẽ chấm so sánh.');
