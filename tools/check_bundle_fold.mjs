/**
 * Kiểm tra bản build: hàm bỏ dấu tiếng Việt có còn nguyên trong bundle không.
 *
 * Cần script riêng vì PowerShell in ra console làm mất ký tự không phải
 * ASCII — `đ` hiện thành `d`, `ỏ` hiện thành `?`... nhìn như đã hỏng dù
 * file vẫn đúng. Ở đây in ra MÃ LỐI KÝ TỰ (U+XXXX) nên không bị hiểu nhầm.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'web/out/_next/static/chunks');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** In ra chuỗi kèm mã lối ký tự cho mọi ký tự không phải ASCII */
const showCodes = (s) =>
  [...s].map((c) => (c.codePointAt(0) < 128 ? c : `<U+${c.codePointAt(0).toString(16).toUpperCase()}>`)).join('');

let found = 0;
let ok = 0;

for (const file of walk(DIR)) {
  if (!file.endsWith('.js')) continue;
  const c = readFileSync(file, 'utf8');
  let i = c.indexOf('NFD');
  while (i >= 0) {
    found++;
    const seg = c.slice(i, i + 80);
    const hasRange = seg.includes('\\u0300-\\u036f');
    // `đ` phải là U+0111, `Đ` là U+0110. Nếu biến thành ký tự ASCII
    // (`d`, `D`) thì phép thay thế là vô nghĩa.
    // Chú ý: toHexString() KHÔNG thêm số 0 ở đầu → "111", không phải "0111".
    const codes = showCodes(seg);
    const hasDD = /<U\+111>/.test(codes) && /<U\+110>/.test(codes);
    const okAll = hasRange && hasDD;
    if (okAll) ok++;
    console.log(`${okAll ? '✓' : '✗'} ${file.split(/[\\/]/).pop()}`);
    console.log(`   ${codes.slice(10)}`);
    i = c.indexOf('NFD', i + 1);
  }
}

console.log(`\n${ok}/${found} bản sao hàm bỏ dấu trong bundle lành lặn.`);
if (ok !== found) process.exitCode = 1;