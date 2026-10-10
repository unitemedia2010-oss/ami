/**
 * Ghi đè href của THẺ <a> PHẲNG thành href={u('...')} để chạy được trên
 * project site của GitHub (…github.io/ami/).
 *
 * ⚠ Bài học rút ra sau lần làm sai đầu tiên:
 *     KHÔNG được đụng vào <Link>. Next.js tự gắn basePath vào href của
 *     Link, nếu ta gắn thêm lần nữa sẽ thành /ami/ami/tim-kiem.
 *     Script bên dưới chỉ khớp thẻ mở <a …>, bỏ qua <Link …>.
 *
 * Dùng:  node tools/fix_internal_links.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../web/src');

// Khớp thẻ mở <a …> hoặc <Link …>, kể cả khi xuống dòng.
const RE_TAG = /<(Link|a)\b([^>]*)>/gs;

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    // Bỏ qua lib/ — đó là nơi chứa chính hàm u(); chạy script trên đó sẽ
    // tự chèn import vào giữa khối chú thích.
    if (statSync(p).isDirectory()) return n === 'lib' ? [] : walk(p);
    return [p];
  });
}

let total = 0;
for (const file of walk(ROOT)) {
  if (!/\.(tsx|ts)$/.test(file)) continue;
  const src = readFileSync(file, 'utf8');
  let n = 0;

  let out = src.replace(RE_TAG, (tag, name, attrs) => {
    if (name === 'Link') return tag;               // Next tự gắn basePath
    if (!/href="(\/(?!\/)[^"]*)"/.test(attrs)) return tag;
    return tag.replace(/href="(\/(?!\/)[^"]*)"/, (_, p) => { n++; return `href={u('${p}')}`; });
  });

  // location.href = '/x'  (không nằm trong thẻ nào)
  out = out.replace(/location\.href\s*=\s*'(\/[^']*)'/g, (_, p) => {
    n++; return `location.href = u('${p}')`;
  });

  if (out === src) continue;

  if (/\bu\('/.test(out) && !/from '@\/lib\/basePath'/.test(out)) {
    const lines = out.split('\n');
    let last = 0;
    for (let i = 0; i < lines.length; i++) if (/^import /.test(lines[i])) last = i;
    lines.splice(last + 1, 0, "import { u } from '@/lib/basePath';");
    out = lines.join('\n');
  }
  writeFileSync(file, out, 'utf8');
  console.log(`  ${String(n).padStart(2)}  ${relative(ROOT, file)}`);
  total += n;
}

console.log(`\nĐã sửa ${total} đường dẫn nội bộ.`);
console.log('Kiểm tra: chạy lại lần nữa phải ra "Đã sửa 0 đường dẫn nội bộ."');