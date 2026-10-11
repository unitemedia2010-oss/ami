/**
 * Ép regex bỏ dấu trong source về dạng escape \u0300-\u036f.
 *
 * Ghi bằng script thay vì sửa tay vì hai lý do:
 *   1. Dải ký tự tổ hợp gõ tay rất dễ bị biến đổi khi lưu qua nhiều lớp
 *      encode (editor, script, console Windows). Đã từng hỏng thành
 *      /['-?]/g — build vẫn báo thành công nhưng mọi tìm kiếm tiếng Việt
 *      không dấu đều trả 0 kết quả.
 *   2. Dạng escape chỉ gồm ASCII nên không bao giờ bị đổi.
 *
 * Chạy:  node tools/fix_fold_escape.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'web/src';

/** Dải ký tự thật U+0300–U+036F */
const RAW_RANGE = '[̀-ͯ]';
const ESCAPED = '[\\u0300-\\u036f]';

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let fixed = 0;
for (const f of walk(SRC)) {
  if (!/\.(tsx?|css)$/.test(f)) continue;
  const src = readFileSync(f, 'utf8');
  let out = src;

  // thay dải thô trong regex bằng dạng escape
  out = out.split(`.replace(/${RAW_RANGE}/g, '')`).join(`.replace(/${ESCAPED}/g, '')`);

  // đ/Đ viết bằng ký tự thật cũng dễ hỏng → dùng \u0111 / \u0110
  out = out.split(".replace(/đ/g, 'd')").join(".replace(/\\u0111/g, 'd')");
  out = out.split(".replace(/Đ/g, 'D')").join(".replace(/\\u0110/g, 'D')");

  if (out !== src) {
    writeFileSync(f, out, 'utf8');
    console.log(`  sửa ${f}`);
    fixed++;
  }
}
console.log(fixed ? `\n${fixed} file đã sửa.` : 'Không có gì cần sửa.');