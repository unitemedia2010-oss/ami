/* Tim ANH CHET va LINK CHET trong HTML cua tung trang tren ban live.
 * HTTP 200 khong bao hienh anh tai duoc hay link tro den noi dung that. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'web/src/app');
const BASE = 'https://unitemedia2010-oss.github.io/ami';

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const ds = JSON.parse(readFileSync(join(ROOT, 'web/public/data/districts.json'), 'utf8'));

const TRANG = [
  '/', '/tim-kiem/?district=1', '/du-an/', '/ban-do/', '/so-sanh/',
  '/quan/', '/yeu-thich/', '/lien-he/', '/dang-tin/', '/dang-nhap/',
  '/dieu-khoan/', '/quyen-rieng-tu/', '/huong-dan/', '/ve-chung-toi/',
  ...ds.map((d) => '/quan/' + d.slug),
];

const anhHong = new Map();
const linkHong = new Map();

for (const r of TRANG) {
  const t = await (await fetch(BASE + r, { redirect: 'follow' })).text();

  for (const m of t.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/g)) {
    const u = m[1];
    /* Chi kiem nhung anh thuoc du lieu cua chinh du an — anh goc cua may chu
       (bat ky trang nao cung tro) thi bo qua, khong phai loi cua du lieu. */
    if (/images\.unsplash|placeholder|via\.placeholder|picsum|lorem/i.test(u)) continue;
    if (!anhHong.has(u)) {
      const res = await fetch(u, { method: 'HEAD', redirect: 'follow' }).catch(() => null);
      anhHong.set(u, res ? res.status : 'LOI');
    }
  }

  for (const m of t.matchAll(/href="(\/ami\/[^"#?]*)"/g)) {
    const u = m[1];
    if (!linkHong.has(u)) {
      const res = await fetch('https://unitemedia2010-oss.github.io' + u,
        { method: 'GET', redirect: 'follow' }).catch(() => null);
      linkHong.set(u, res ? res.status : 'LOI');
    }
  }
}

const anhBad = [...anhHong].filter(([, st]) => st !== 200);
const linkBad = [...linkHong].filter(([, st]) => st !== 200);

console.log(`Kiem ${anhHong.size} anh va ${linkHong.size} link noi bo tren ${TRANG.length} trang.`);

if (anhBad.length) {
  console.log(`\n✗ ${anhBad.length} ANH khong tai duoc:`);
  for (const [u, st] of anhBad.slice(0, 25)) console.log(`   ${st}  ${u.slice(0, 110)}`);
} else console.log('\nOK: moi anh deu tai duoc.');

if (linkBad.length) {
  console.log(`\n✗ ${linkBad.length} LINK khong tra 200:`);
  for (const [u, st] of linkBad) console.log(`   ${st}  ${u}`);
} else console.log('OK: moi link deu 200.');

if (anhBad.length || linkBad.length) process.exit(1);