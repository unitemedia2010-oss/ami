/**
 * Kiểm tra danh mục trong web/src/lib/categories.ts có khớp với dữ liệu thật
 * không.
 *
 * ⚠ Nếu lệch, bộ lọc trả về 0 kết quả mà KHÔNG có lỗi build, không có cảnh
 *   báo — người dùng chỉ thấy "0 tin phù hợp" và tưởng trang hỏng.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync('web/src/lib/categories.ts', 'utf8');
const khaiBao = [...src.matchAll(/slug:\s*'([a-z-]+)'/g)].map((m) => m[1]);

const D = 'web/public/data/d';
const coThat = new Map();
for (const f of readdirSync(D)) {
  for (const x of JSON.parse(readFileSync(join(D, f), 'utf8'))) {
    coThat.set(x.category, (coThat.get(x.category) || 0) + 1);
  }
}

console.log(`danh mục khai báo trong code: ${khaiBao.length}`);
console.log(`danh mục có trong dữ liệu  : ${coThat.size}\n`);

let sai = 0;
for (const s of khaiBao) {
  const n = coThat.get(s);
  if (n == null) { console.log(`  ✗ ${s.padEnd(12)} KHAI BÁO NHƯNG DỮ LIỆU KHÔNG CÓ`); sai++; }
  else console.log(`  ✓ ${s.padEnd(12)} ${String(n).padStart(6)} tin`);
}
for (const [s, n] of coThat) {
  if (!khaiBao.includes(s)) { console.log(`  ! ${s.padEnd(12)} ${String(n).padStart(6)} tin — có dữ liệu nhưng code chưa khai báo`); }
}

console.log(sai
  ? `\n${sai} danh mục SAI — bộ lọc sẽ ra 0 kết quả.`
  : '\nOK: mọi danh mục trong code đều có dữ liệu.');
if (sai) process.exitCode = 1;