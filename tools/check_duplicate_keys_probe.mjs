/* Kiểm chứng check_duplicate_keys.mjs: phải bắt lỗi trùng TRONG cùng
   danh sách, và phải bỏ qua việc hai danh sách khác nhau cùng trỏ một chỗ
   (đó là hợp lệ, key nằm ở hai phạm vi riêng). */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = join(ROOT, 'web/src/components/__dup_probe.tsx');

const CASES = [
  ['trung trong cung mot danh sach (loi that)', `
const A = {
  links: [
    ['Can ho', '/tim-kiem/?cat=chung-cu'],
    ['Van phong', '/tim-kiem/?cat=chung-cu'],
  ],
};`, true],

  ['hai danh sach khac nhau cung mot duong dan (hop le)', `
const B = {
  links: [
    ['Huong dan', '/huong-dan'],
    ['Lien he', '/lien-he'],
  ],
};
const C = {
  links: [
    ['Quy trinh', '/huong-dan'],
    ['Lien he', '/lien-he'],
  ],
};`, false],

  ['mien thuong khong trung (OK)', `
const D = {
  links: [
    ['A', '/a'],
    ['B', '/b'],
    ['C', '/c'],
  ],
};`, false],
];

if (existsSync(F)) unlinkSync(F);

let bad = 0;
for (const [ten, jsx, phaiBat] of CASES) {
  writeFileSync(F, `export default function P() {\n  return (\n    <div>\n${jsx}\n    </div>\n  );\n}\n`, 'utf8');
  let bat = false;
  try {
    execFileSync('node', [join(ROOT, 'tools/check_duplicate_keys.mjs')],
      { cwd: ROOT, stdio: 'pipe' });
  } catch { bat = true; }

  const dung = bat === phaiBat;
  if (!dung) bad++;
  console.log(`${dung ? 'OK  ' : 'SAI '} ${ten} — ${bat ? 'bắt' : 'bỏ qua'}`);
}

unlinkSync(F);
if (bad) {
  console.error(`\nFAIL: ${bad} ca sai.`);
  process.exit(1);
}
console.log('\nOK: script phân biệt đúng trùng trong một danh sách với trùng giữa hai danh sách.');
