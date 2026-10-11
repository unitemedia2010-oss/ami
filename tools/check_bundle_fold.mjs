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
    const codes = showCodes(seg);
    const hasRange = seg.includes('\\u0300-\\u036f')
      || /\u0300-\u036f/.test(seg);   // dải ký tự thật
    // `đ`/`Đ` phải là U+0111/U+0110 — hoặc viết bằng escape \u0111/\u0110.
    // Nếu biến thành ký tự ASCII (`d`, `D`) thì phép thay thế là vô nghĩa.
    const hasDD = (/<U\+111>/.test(codes) || /\\u0111/.test(seg))
      && (/<U\+110>/.test(codes) || /\\u0110/.test(seg));
    // Dạng an toàn là escape ASCII; dạng ký tự thật vẫn chạy đúng nhưng
    // đã từng bị hỏng khi lưu file, nên báo riêng để nhắc chuẩn hoá.
    const chuanHoa = seg.includes('\\u0300-\\u036f') && /\\u0111/.test(seg);
    const okAll = hasRange && hasDD;
    if (okAll) ok++;
    if (!okAll || !chuanHoa) {
      console.log(`${okAll ? (chuanHoa ? '~' : '!') : '✗'} ${file.split(/[\\/]/).pop()}${chuanHoa ? '' : '  ← nên dùng dạng escape \u0300-\u036f'}`);
      console.log(`   ${codes.slice(10)}`);
    }
    i = c.indexOf('NFD', i + 1);
  }
}

console.log(`\n${ok}/${found} bản sao hàm bỏ dấu trong bundle lành lặn.`);
console.log('Ký hiệu: ✓ đúng  ·  ! chạy được nhưng nên dùng dạng escape  ·  ✗ HỎNG');
if (ok !== found) process.exitCode = 1;