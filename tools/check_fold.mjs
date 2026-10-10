/**
 * Kiểm tra và sửa hàm bỏ dấu tiếng Việt bị HỎNG trong các file nguồn.
 *
 * ⚠ Lỗi rất dễ gặp: dải ký tự tổ hợp U+0300–U+036F khi được ghi ra file có
 *   thể bị biến thành ký tự khác. Regex `/[̀-ͯ]/g` sẽ trở thành
 *   `/['-?]/g` — nhìn có vẻ đúng nhưng KHÔNG bỏ dấu, chỉ xoá dấu nháy,
 *   dấu gạch ngang và dấu hỏi. Hậu quả: mọi tìm kiếm tiếng Việt không dấu
 *   ("go vap") đều không khớp với "Gò Vấp" → trang báo 0 kết quả.
 *
 *   Cách sửa đúng và chống tái phạm: dùng dạng escape \u0300-\u036f, chỉ gồm
 *   ký tự ASCII nên không thể bị biến đổi khi qua bất kỳ bước encode nào.
 *
 * Dùng:  node tools/check_fold.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const FILES = [
  'web/src/lib/staticData.ts',
  'workers/mock/dataset.mjs',
  'web/src/lib/api.ts',
  'workers/api/src/index.js',
];

// Regex hiện tại (kể cả bản đã hỏng) — chỉ để nhận diện, không dùng để kiểm tra
const CURRENT_FOLD = /replace\(\/\[([^\]]*)\]\/g,\s*''\)/g;
const SAFE_FOLD = ".replace(/[\\u0300-\\u036f]/g, '')";

/** Đoạn thay thế an toàn: bỏ dấu tổ hợp + đưa đ/Đ về d/D */
const SAFE_DD = ".replace(/\\u0111/g, 'd').replace(/\\u0110/g, 'D')";

let fixed = 0;

for (const rel of FILES) {
  const path = join(ROOT, rel);
  let src;
  try { src = readFileSync(path, 'utf8'); } catch { continue; }

  const before = src;
  let n = 0;

  src = src.replace(CURRENT_FOLD, (m, body) => {
    // đúng chuẩn rồi thì giữ nguyên
    if (body === '\\u0300-\\u036f') return m;
    n++;
    return SAFE_FOLD;
  });

  // các biểu thức đ/Đ bị hỏng thành /d/g và /D/g — nghĩa là thay không ra gì
  src = src.replace(/\.replace\(\/d\/g,\s*'d'\)/g, () => { n++; return SAFE_DD; });
  src = src.replace(/\.replace\(\/D\/g,\s*'D'\)/g, () => { n++; return SAFE_DD; });

  if (src !== before) {
    writeFileSync(path, src, 'utf8');
    console.log(`  sua ${String(n).padStart(2)}  ${rel}`);
    fixed += n;
  }
}

console.log(`\n${fixed} biểu thức đã sửa.`);
console.log('Chạy lại lần nữa phải ra "0 biểu thức đã sửa."');