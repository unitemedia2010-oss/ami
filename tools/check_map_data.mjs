/** Kiểm tra bản xuất: bao nhiêu marker là toạ độ thật, bao nhiêu là tâm quận. */
import { readFileSync } from 'node:fs';

const map = JSON.parse(readFileSync('web/public/data/map.json', 'utf8'));
const proj = JSON.parse(readFileSync('web/public/data/projects.json', 'utf8'));
const meta = JSON.parse(readFileSync('web/public/data/meta.json', 'utf8'));

const that = map.filter((p) => !p.approximate);
const uoc = map.filter((p) => p.approximate);

console.log(`tổng dự án      : ${proj.length}`);
console.log(`có toạ độ      : ${map.length}`);
console.log(`  • toạ độ thật : ${that.length}`);
console.log(`  • tâm quận   : ${uoc.length}`);
console.log(`\ntỉ lệ toạ độ thật: ${((that.length / map.length) * 100).toFixed(0)}%`);

const theoNguon = {};
for (const p of that) theoNguon[p.geo_source] = (theoNguon[p.geo_source] || 0) + 1;
console.log('theo nguồn định vị:', JSON.stringify(theoNguon));

/* kiểm tra toạ độ có nằm trong bình bao TP.HCM không */
const BOX = { latMin: 10.30, latMax: 11.25, lngMin: 106.30, lngMax: 107.10 };
const raNgoai = map.filter((p) => p.lat < BOX.latMin || p.lat > BOX.latMax
  || p.lng < BOX.lngMin || p.lng > BOX.lngMax);
console.log(`\ntoạ độ nằm NGOÀI bình bao TP.HCM: ${raNgoai.length}`);
for (const p of raNgoai) console.log(`  ${p.name}: ${p.lat}, ${p.lng}`);

/* kiểm tra trùng toạ độ */
const nhom = new Map();
for (const p of map) {
  const k = `${p.lat},${p.lng}`;
  nhom.set(k, (nhom.get(k) || 0) + 1);
}
const trung = [...nhom.values()].filter((n) => n > 1);
console.log(`\nnhóm trùng toạ độ: ${trung.length}` + (trung.length ? ` (tối đa ${Math.max(...trung)} tên)` : ''));

console.log('\nmeta:', JSON.stringify(meta.counts));