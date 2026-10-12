/* Kiem chung check_compare_remove.mjs bang cac ca loi CO Y.
   Chi chay khi -DUNG, vi no sua file nguon tam thoi. */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = join(ROOT, 'web/src/app/so-sanh/page.tsx');
const BAK = F + '.probe';
const goc = readFileSync(F, 'utf8');

const CASES = [
  ['X de len nut tim (top-9)', /absolute top-11 right-0/, 'absolute top-9 right-0', true],
  ['bo aria-label cua nut X', /aria-label=\{`Bỏ khỏi so sánh: \$\{l\.title\}`\}\n/, '', true],
  ['xoa nut X khoi thead', /\s*<iconify-icon icon="lucide:x"[^>]*\/>/, '', true],
  ['bo nut chu de doi ten', /<iconify-icon icon="lucide:trash-2" \/>/, '<iconify-icon icon="lucide:x" />', true],
];

let sai = 0;
for (const [ten, timThay, thayBang, phaiBat] of CASES) {
  writeFileSync(BAK, goc);
  const sua = goc.replace(timThay, thayBang);
  if (sua === goc) {
    console.log(`SAI  ${ten} — khong tim thay doan can sua (script soat cap nhat roi?)`);
    sai++;
    continue;
  }
  writeFileSync(F, sua);
  let bat = false;
  try {
    execFileSync('node', [join(ROOT, 'tools/check_compare_remove.mjs')],
      { cwd: ROOT, stdio: 'pipe' });
  } catch { bat = true; }

  const dung = bat === phaiBat;
  if (!dung) sai++;
  console.log(`${dung ? 'OK  ' : 'SAI '} ${ten} — ${bat ? 'bi bat' : 'bo qua'}`);
}

writeFileSync(F, goc);
console.log('\nda khoi phuc file nguon');
if (sai) { console.error(`\nFAIL: ${sai} ca sai.`); process.exit(1); }
console.log('OK: script bat dung loi that va bo qua cau hinh dung.');
