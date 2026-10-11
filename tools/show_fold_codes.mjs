/** In ra mã lối ký tự của regex bỏ dấu trong từng file, không qua console. */
import { readFileSync } from 'node:fs';

const F = ['web/src/lib/staticData.ts', 'web/src/app/admin/tin-dang/tao/page.tsx'];

for (const f of F) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (!l.includes('NFD')) return;
    const seg = l.slice(l.indexOf('NFD'), l.indexOf('NFD') + 70);
    const inK = [...seg].map((c) =>
      c.codePointAt(0) < 128 ? c : `<U+${c.codePointAt(0).toString(16).toUpperCase()}>`).join('');
    const ok = seg.includes('\\u0300');
    console.log(`${ok ? '✓' : '✗'} ${f}:${i + 1}`);
    console.log(`   ${inK}`);
  });
}
console.log('\n✓ = dùng dạng escape \\u0300-\\u036f (chỉ ASCII, không thể hỏng khi qua bước encode)');
console.log('✗ = dùng ký tự thật — đã từng hỏng thành /[\'-\?]/g khi ghi file');