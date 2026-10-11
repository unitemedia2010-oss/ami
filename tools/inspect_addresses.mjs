/** Xem chất lượng dữ liệu địa chỉ trong tools/projects.json — quyết định có
 *  thể định vị tự động được không, và bằng cách nào. */
import { readFileSync } from 'node:fs';

const p = JSON.parse(readFileSync('tools/projects.json', 'utf8'));

console.log(`tổng dự án: ${p.length}\n`);

const coDiaChi = p.filter((x) => x.address && x.address.trim());
console.log(`có địa chỉ: ${coDiaChi.length}/${p.length}\n`);

console.log('--- 12 mẫu có địa chỉ ---');
for (const x of coDiaChi.slice(0, 12)) {
  console.log(`${(x.name || '').padEnd(38)} | ${x.district || '?'} | ${x.address}`);
}

console.log('\n--- 12 mẫu KHÔNG có địa chỉ ---');
for (const x of p.filter((x) => !x.address || !x.address.trim()).slice(0, 12)) {
  console.log(`${(x.name || '').padEnd(38)} | ${x.district || '?'} | (trống)`);
}

/* thống kê địa chỉ có chứa mốc địa hình đủ để geocode không */
const hasSo = coDiaChi.filter((x) => /\d/.test(x.address));
const hasTenDuong = coDiaChi.filter((x) => /(đường|đ\.|phường|p\.|quận|q\.|hẻm|toà|apartment|Residence|Tower)/i.test(x.address));
console.log(`\nđịa chỉ có số nhà: ${hasSo.length}`);
console.log(`địa chỉ có tên đường/phường: ${hasTenDuong.length}`);

console.log('\n--- phân bố quận trong dữ liệu ---');
const dist = {};
for (const x of p) dist[x.district || '(trống)'] = (dist[x.district || '(trống)'] || 0) + 1;
for (const [k, v] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(3)}  ${k}`);
}