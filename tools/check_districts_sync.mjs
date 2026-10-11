/* Kiểm tra districts.ts (sinh tự động) có khớp districts.json không.
   Lệch ở đây = URL /quan/[slug] 404 vĩnh viễn hoặc sinh ra trang rỗng. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ts = readFileSync(join(ROOT, 'web/src/data/districts.ts'), 'utf8');
const dj = JSON.parse(readFileSync(join(ROOT, 'web/public/data/districts.json'), 'utf8'));

const tsList = [...ts.matchAll(/"slug":\s*"([^"]+)",\s*\n\s*"name_new":\s*"([^"]+)"/g)]
  .map((m) => ({ slug: m[1], name: m[2] }));

const a = new Set(tsList.map((x) => x.slug));
const b = new Set(dj.map((x) => x.slug));

const chiTs = [...a].filter((x) => !b.has(x));
const thieu = [...b].filter((x) => !a.has(x));
const lech = dj.filter((d) => tsList.find((x) => x.slug === d.slug)?.name !== d.name_new);

if (chiTs.length || thieu.length || lech.length) {
  console.error('FAIL: districts.ts lệch districts.json');
  if (chiTs.length) console.error('  chỉ có trong .ts (sinh trang rỗng):', chiTs.join(', '));
  if (thieu.length) console.error('  thiếu trong .ts (404):', thieu.join(', '));
  if (lech.length) console.error('  tên lệch:', lech.map((d) => d.slug).join(', '));
  process.exit(1);
}
console.log(`OK: ${tsList.length} quận khớp hoàn toàn với districts.json.`);
