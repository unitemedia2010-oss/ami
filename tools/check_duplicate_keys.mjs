/**
 * Soát React key trùng trong danh sách dựng tĩnh.
 *
 * ⚠ Vì sao cần:
 *   React KHÔNG báo lỗi build khi hai phần tử cùng key. Trang vẫn render,
 *   chỉ ghi ra console "Encountered two children with the same key" và có
 *   thể âm thầm BỎ SÓT phần tử khi cập nhật. Ở dự án này, ba mục trong
 *   footer ("Văn phòng cho thuê", "Cửa hàng cho thuê", "Dự án nổi bật")
 *   trùng href với mục khác nên key={href} va đập — không ai thấy cho tới
 *   khi mở console.
 *
 *   Cách dò: đọc các mảng dạng `[[label, href], …]` rồi kiểm tra trùng.
 *   Bỏ qua phần tử động (không có chuỗi literal) vì không dò được tĩnh.
 *
 *   Cách dùng:  node tools/check_duplicate_keys.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'web/src');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/* Bắt cặp [a, b] gồm hai chuỗi literal — đủ cho kiểu
   `links: [['Nhãn', '/duong-dan'], …]` ở các file cấu hình. */
const PAIR = /\[\s*(['"])((?:[^'"\\]|\\.)*)\1\s*,\s*(['"])((?:[^'"\\]|\\.)*)\3\s*\]/g;

/* React key chỉ phải khác nhau TRONG cùng một danh sách con. Hai danh sách
   khác nhau (hai cột footer, ví dụ) có thể cùng trỏ tới /lien-he mà vẫn
   không lỗi. Nên phải tách danh sách trước, không soát cả file.
   Bắt theo `links:` rồi tới dấu `]` đóng mảng — không quan tâm mảng nằm
   trong const, export hay object lồng nhau. */
const BLOCK = /\blinks\s*:\s*\[([\s\S]*?)\n\s*\]/g;

const problems = [];
let totalPairs = 0;

for (const file of walk(SRC)) {
  if (!/\.tsx?$/.test(file)) continue;
  const src = readFileSync(file, 'utf8');

  BLOCK.lastIndex = 0;
  for (const block of src.matchAll(BLOCK)) {
    const body = block[1];
    /* Dòng chứa khối — dùng để báo lỗi đúng chỗ. */
    const dong = src.slice(0, block.index).split('\n').length;
    const seen = new Map();   // href → nhãn đã thấy trong danh sách này

    body.split('\n').forEach((line, off) => {
      for (const m of line.matchAll(PAIR)) {
        const label = m[2];
        const href = m[4];
        totalPairs++;
        const prev = seen.get(href);
        if (prev) {
          problems.push({
            /* relative() chứ không phải replace(cwd + '\\'): cách cắt bằng
               chuỗi chỉ đúng trên Windows. */
            file: relative(process.cwd(), file),
            line: dong + off,
            href,
            truoc: prev.label,
            truocDong: prev.line,
            sau: label,
          });
        } else {
          seen.set(href, { label, line: dong + off });
        }
      }
    });
  }
}

if (problems.length === 0) {
  console.log(`OK: ${totalPairs} cặp [nhãn, đường dẫn] — không có đường dẫn trùng trong cùng danh sách.`);
} else {
  console.log(`✗ ${problems.length} đường dẫn bị lặp — key={href} sẽ đập:\n`);
  for (const p of problems) {
    console.log(`   ${p.file}:${p.line}`);
    console.log(`     "${p.truoc}" (dòng ${p.truocDong})  và  "${p.sau}"`);
    console.log(`     cùng trỏ tới: ${p.href}\n`);
  }
  console.log('Sửa: cho mỗi mục một đường dẫn riêng, hoặc đổi key sang nhãn.');
  process.exitCode = 1;
}
