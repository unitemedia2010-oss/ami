/* "5 toà" la so toa nha hay so tin dang? Kiem du lieu that. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = join(dirname(fileURLToPath(import.meta.url)), '../web/public/data');
const projects = JSON.parse(readFileSync(join(D, 'projects.json'), 'utf8'));

const b = projects.find((p) => p.name === 'The Botanica');
console.log('The Botanica:', JSON.stringify({
  id: b?.id, name: b?.name,
  building_count: b?.building_count,
  apartment_count: b?.apartment_count,
  from_listings: b?.from_listings,
}, null, 1));

/* Dem so tin dang thuc su thuoc du an */
const shards = ['tan-binh'].map((s) =>
  JSON.parse(readFileSync(join(D, `d/${s}.json`), 'utf8'))).flat();
const ten = (b?.name || '').trim().toLowerCase();
const tin = shards.filter((l) => (l.project_name || '').trim().toLowerCase() === ten);
console.log('\ntin dang that su thuoc du an:', tin.length);

console.log('\n--- phan bo toan bo du an ---');
let coBuilding = 0, coApartment = 0;
for (const p of projects) {
  if (p.building_count != null) coBuilding++;
  if (p.apartment_count != null) coApartment++;
}
console.log('co building_count :', coBuilding, '/', projects.length);
console.log('co apartment_count:', coApartment, '/', projects.length);

const gia = projects.filter((p) => p.building_count != null).slice(0, 5);
console.log('\nvi du co building_count:', gia.map((p) =>
  `${p.name}: toà=${p.building_count} tin=${p.apartment_count}`).join('\n              '));
