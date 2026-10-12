/* Quet TOAN BO trang tren ban live: trang loi, mat tieu de, tro toi noi dung.
   Lay danh sach tu file luu, khong go tay — trang moi them vao se bi quet luon. */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'web/src/app');
const BASE = 'https://unitemedia2010-oss.github.io/ami';

/* ---------------------------------------------------- duyet cay thu muc */
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const routes = new Set(['/']);
for (const f of walk(APP)) {
  if (!f.endsWith('page.tsx')) continue;
  let r = '/' + relative(APP, f).replace(/\\/g, '/').replace(/\/?page\.tsx$/, '');
  r = r.replace(/\/$/, '');
  /* /quan/[slug] -> /quan/thu-duc (mot mau); các route dong duoc gan sau */
  if (r.includes('[')) continue;
  routes.add(r || '/');
}
routes.add('/quan/thu-duc');
routes.add('/tim-kiem');

const ds = JSON.parse(readFileSync(join(ROOT, 'web/public/data/districts.json'), 'utf8'));
for (const d of ds) routes.add('/quan/' + d.slug);

const dsProjects = JSON.parse(readFileSync(join(ROOT, 'web/public/data/projects.json'), 'utf8'));
const coTin = dsProjects.filter((p) => p.apartment_count > 0).slice(0, 3);
for (const p of coTin) routes.add('/tim-kiem/?project=' + p.id);

const loi = [];
const bang = [];

for (const r of [...routes].sort()) {
  const url = BASE + (r.startsWith('/tim-kiem') ? r : r + '/');
  let row = { duong: r };
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const t = await res.text();
    const tie = (t.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
    row.status = res.status;
    row.tieuDe = tie.slice(0, 44);
    row.kb = Math.round(t.length / 1024);
    row.loi = /Application error|client-side exception|__NEXT_ERROR/i.test(t);
    row.trang404 = /There isn.t a GitHub Pages site|Site not found/i.test(t);
    if (res.status !== 200) loi.push(`${r} → HTTP ${res.status}`);
    if (row.loi) loi.push(`${r} → co loi client-side trong HTML`);
    if (row.trang404) loi.push(`${r} → 404 Pages`);
    if (!tie.trim()) loi.push(`${r} → thieu <title>`);
  } catch (e) {
    row.status = 'LOI';
    row.loi = true;
    loi.push(`${r} → ${String(e).slice(0, 60)}`);
  }
  bang.push(row);
}

console.table(bang);
console.log(`\nQuet ${bang.length} duong dan.`);

if (loi.length) {
  console.error('\nFAIL:\n  - ' + loi.join('\n  - '));
  process.exit(1);
}
console.log('OK: khong trang nao loi.');