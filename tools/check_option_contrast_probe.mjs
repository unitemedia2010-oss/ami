/* Kiem chung check_option_contrast.mjs bang cách tra ve cau hinh hong. */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = join(ROOT, 'web/src/components/SiteHeader.tsx');
const goc = readFileSync(F, 'utf8');

const HET = '[&>option]:bg-white [&>option]:text-coal-900 [&>option]:font-semibold';

const CASES = [
  /* Chuỗi class BẮT ĐẦU bằng `[&>option]` ngay sau dấu nháy — không có
     khoảng trắng dẫn. Thêm khoảng trắng vào mẫu thì replace không khớp và
     probe báo "sửa không đổi gì", tức nó đang tự dệ ra kết luận sai. */
  ['bo ep nen cho option',
   goc.replace(HET, '[&>option]:text-coal-900 [&>option]:font-semibold')],
  ['ep chu option trang',
   goc.replace('[&>option]:text-coal-900', '[&>option]:text-white')],
  ['bo het ep mau option',
   goc.replace(HET, '')],
];

let sai = 0;
for (const [ten, sua] of CASES) {
  if (sua === goc) { console.log(`SAI  ${ten} — sua khong doi gi`); sai++; continue; }
  writeFileSync(F, sua);
  let bat = false;
  try {
    execFileSync('node', [join(ROOT, 'tools/check_option_contrast.mjs')],
      { cwd: ROOT, stdio: 'pipe' });
  } catch { bat = true; }
  writeFileSync(F, goc);
  if (!bat) { console.log(`SAI  ${ten} — script KHONG bat`); sai++; }
  else console.log(`OK   ${ten} — bị bắt`);
}

writeFileSync(F, goc);
console.log('\nđã khôi phục file nguồn');
if (sai) { console.error(`\nFAIL: ${sai} ca sai.`); process.exit(1); }
console.log('OK: script bắt đúng cả lỗi.');
