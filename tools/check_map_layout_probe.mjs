/* Kiem chung check_map_layout.mjs bang cách sửa nguon theo tung loi.
   Sua tam thoi, khoi phuc xong. */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = join(ROOT, 'web/src/components/SiteHeader.tsx');
const G = join(ROOT, 'web/src/app/ban-do/page.tsx');
const goc = readFileSync(F, 'utf8');

const CASES = [
  ['tra lai day chip quan',
    () => { let s = goc;
      s = s.replace('id="hd-district"', 'id="x"');
      s = s.replace('</select>', '</select></nav>');
      s = s.replace('<SearchBar', '<nav aria-label="Khu vực"><SearchBar');
      s = s.replace('/></div>', '/></div></nav>');
      return s; }, F],

  ['bo loc ve luoi 5 o',
    () => readFileSync(G, 'utf8').replace('overflow-x-auto no-scrollbar',
      'grid sm:grid-cols-2 lg:grid-cols-5 gap-3'), G],

  ['bo hop chi tiet ben phai',
    () => readFileSync(G, 'utf8')
      .replace('lg:grid-cols-[1fr_370px]', 'grid-cols-1')
      .replace('<aside', '<div').replace('</aside>', '</div>'), G],

  ['bam cham la dieu huong sang trang khac',
    () => readFileSync(G, 'utf8').replace(
      /setPicked\(rows\.find\(\(r\) => r\.id === p\.id\) \?\? null\);/,
      'window.location.href = "/tim-kiem";'), G],
];

let sai = 0;
for (const [ten, suaFn, file] of CASES) {
  const goc2 = readFileSync(file, 'utf8');
  const sua = suaFn();
  if (sua === goc2) { console.log(`SAI  ${ten} — sua khong doi gi`); sai++; continue; }
  writeFileSync(file, sua);
  let bat = false;
  try {
    execFileSync('node', [join(ROOT, 'tools/check_map_layout.mjs')],
      { cwd: ROOT, stdio: 'pipe' });
  } catch { bat = true; }
  writeFileSync(file, goc2);
  if (!bat) { console.log(`SAI  ${ten} — script KHONG bat loi`); sai++; }
  else console.log(`OK   ${ten} — bi bat`);
}

writeFileSync(F, goc);
console.log('\nda khoi phuc file nguon');
if (sai) { console.error(`\nFAIL: ${sai} ca sai.`); process.exit(1); }
console.log('OK: script bat dung ca loi bo cuc.');
