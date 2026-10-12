/**
 * Kiểm tra script soát chạy được trên LINUX.
 *
 * ⚠ Vì sao cần:
 *   Đã có một lần deploy đỏ vì lý do này. check_raw_paths.mjs cắt tiền tố
 *   bằng `file.replace(process.cwd() + '\\', '')`. Trên Windows dấu `\` khớp
 *   nên chạy trơn tru; trên Linux (GitHub Actions) dấu `\` không có trong
 *   đường dẫn nên replace không cắt được, biến thành đường dẫn tuyệt đối
 *   rồi join lại thành đường dẫn sai → ENOENT.
 *
 *   Điều đáng nói: script vẫn XANH trên máy Windows. Không có cách nào phát
 *   hiện mà không mô phỏng đường dẫn kiểu POSIX. Script này làm đúng việc
 *   đó — dựng lại tình huống Linux và kiểm logic cắt đường dẫn.
 *
 *   Cách dùng:  node tools/check_posix_paths.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative } from 'node:path';

/* Trên CI, cwd là /home/runner/work/<repo>/<repo>. Dùng đường dẫn giả để mô
   phỏng — không cần đường dẫn có thật, chỉ cần đúng HÌNH DẠNG. */
const CI_CWD = '/home/runner/work/ami/ami';
const CI_FILE = `${CI_CWD}/web/src/app/du-an/page.tsx`;
const CI_SRC = `${CI_CWD}/web/src`;

const loi = [];
const ok = [];

/* ------------------ 1. replace(cwd + '\\') — CÁCH SAI, chạy để THẤY lỗi */
{
  const relCu = CI_FILE.replace(CI_CWD + '\\', '').replace(/\\/g, '/');
  const docCu = posix.join(CI_SRC, relCu.replace(/^web\/src\//, ''));
  if (docCu === CI_FILE) {
    loi.push('mo phong khong tao duoc loi — kiem tra lai duong dan gia lap');
  }
  ok.push(`replace(cwd + '\\\\') -> ${docCu === CI_FILE ? 'dung' : docCu}`);
}

/* ----------------------------------------------- 3. relative() — CÁCH ĐÚNG */
{
  /* Phai dung posix.relative, KHONG dung relative cua path.
     Script nay chay tren Windows nen relative() tra khoang trang nguoc, va
     posix.join khong doi lai — ra `app\du-an\page.tsx`. Nhu vay lai ra ket
     qua sai tren chinh may dang chay.
     Mo phong Linux thi phai mo phong du ca hai. */
  const relMoi = posix.relative(CI_SRC, CI_FILE);
  const docMoi = posix.join(CI_SRC, relMoi);
  if (docMoi !== CI_FILE) {
    loi.push(`posix.relative()+posix.join() phai ra ${CI_FILE} nhung ra ${docMoi}`);
  }
  ok.push(`posix.relative()+posix.join(): ${docMoi === CI_FILE ? 'OK' : 'SAI'}`);
}

/* --------------------------- 4. script soát KHÔNG dùng replace(cwd+'\\') */
{
  const TOOLS = join(process.cwd(), 'tools');
  const bad = [];
  for (const f of readdirSync(TOOLS)) {
    if (!f.endsWith('.mjs')) continue;
    const raw = readFileSync(join(TOOLS, f), 'utf8');
    /* Bo comment thuc su, khong phai chi loc tien to dong.
       Comment nhieu dong trong cac file nay co ghi nguyen doan ma bi loi,
       nen loc theo dau dong se bao nham chinh loi do. */
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');
    if (/process\.cwd\(\)\s*\+\s*['"]\\\\/.test(src)) bad.push(f);
  }
  if (bad.length) {
    loi.push(`script dung replace(cwd + '\\\\') se chet tren Linux: ${bad.join(', ')}`);
  }
  ok.push(`quet tools/*.mjs: ${bad.length === 0 ? 'OK' : bad.join(', ')}`);
}

for (const o of ok) console.log('  ' + o);
if (loi.length) {
  console.error('\nFAIL:\n  - ' + loi.join('\n  - '));
  process.exit(1);
}
console.log('\nOK: duong dan xu ly dung tren ca Windows lan Linux.');
