/* Chạy bài thử cho nhiều model song song rồi lưu kết quả.
 * Chạy qua Node thay vì .cmd vì: prompt tiếng Việt bị .cmd làm hỏng encoding,
 * và cần bóc mã ANSI. */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'ket-qua');
mkdirSync(OUT, { recursive: true });

const CLI = 'C:\\Users\\nptru\\AppData\\Local\\Programs\\@opencodedesktop\\resources\\opencode-cli.exe';

const MODELS = [
  'opencode/exo-free',
  'opencode/ling-3.1-flash-free',
  'opencode/longcat-2.5-preview-free',
  'opencode/space-bunny-free',
  'opencode/mimo-v2.6-flash-free',
  'opencode/step-5-preview-free',
  'opencode/muse-spark-1.3-contributor-free',
  'opencode/nemotron-3.5-lightning-free',
  'opencode/big-pickle',
];

/* Chỉ đưa phần câu hỏi, KHÔNG đưa phần đáp án.
 *
 * ⚠ Chặn hai lớp vì bài thử rò rỉ đáp án thì kết quả đẹp nhưng vô giá trị:
 *   1. cắt theo marker → quên marker là cả bài thử hỏng (đã xảy ra)
 *   2. bỏ mọi khối <details>…</details> dù có marker hay không
 * Bước 2 là lưới an toàn: sau này thêm đáp án mà quên marker vẫn không lộ. */
const bai = readFileSync(join(HERE, 'Bai-thu.md'), 'utf8');
const cauHoi = bai
  .split('<!-- dap-an-chi -->')[0]
  .replace(/<details>[\s\S]*?<\/details>/g, ' ')
  .trim();

if (/<details>|Đáp án|KẾ THỪA \(inherit\)/.test(cauHoi)) {
  console.error('FAIL: dap an van con lot vao cau hoi — BO QUA, ket qua se vo gia tri.');
  process.exit(1);
}
console.log(`Cau hoi: ${cauHoi.length} ky tu, khong lo dap an.\n`);

/* Bỏ các khối <details> để không lộ đáp án, nhưng giữ nguyên phần hỏi. */
const prompt = `Bạn là lập trình viên. Dưới đây là 4 lỗi đã xảy ra thật trong một dự án. Mọi lỗi đều KHÔNG làm build đỏ và không có báo lỗi nào.

Đọc kỹ từng lỗi rồi trả lời: nhận ra nguyên nhân gốc, cách sửa thế nào, và nói rõ nếu bạn không chắc.
Trả lời đánh số theo từng lỗi, ngắn gọn, không cần viết lại code dài.

---

${cauHoi}`;

const bocs = (s) =>
  s.replace(/\[[0-9;?]*[ -/]*[@-~]/g, '')
   .replace(/\][^]*/g, '')
   .replace(/\r/g, '')
   .trim();

// Lo nho: da thu 3 model cung luc, may het bo nho va opencode server
// restart, mat ca phien dang lam viec. 2 la muc chiu duoc.
const LO = Number(process.env.LO || 2);
const het = new Set();

const chay = (model) => new Promise((xo) => {
  const ten = model.split('/')[1];
  const started = Date.now();
  const p = spawn(CLI, ['run', '--model', model, '--format', 'default', '--auto', prompt], {
    cwd: HERE,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  let ra = '', loi = '';
  p.stdout.on('data', (d) => { ra += d; });
  p.stderr.on('data', (d) => { loi += d; });
  p.on('close', (code) => {
    const giay = Math.round((Date.now() - started) / 1000);
    const noi = bocs(ra);
    writeFileSync(join(OUT, `${ten}.txt`),
      `MODEL: ${model}\nTHOI GIAN: ${giay}s\nEXIT: ${code}\n\n${noi}\n`,
      'utf8');
    if (loi.trim()) {
      writeFileSync(join(OUT, `${ten}.stderr.txt`), bocs(loi), 'utf8');
    }
    console.log(`${code === 0 ? 'OK ' : 'LO'} ${ten.padEnd(38)} ${String(giay).padStart(4)}s  ${noi.length} ky tu`);
    het.add(ten);
    xo();
  });
  // chặn treo: một model không phản hồi thì bỏ qua, không chặn cả lô
  setTimeout(() => { try { p.kill(); } catch {} }, 6 * 60 * 1000).unref?.();
});

console.log(`Chay ${MODELS.length} model, moi luc ${LO}\n`);
for (let i = 0; i < MODELS.length; i += LO) {
  await Promise.all(MODELS.slice(i, i + LO).map(chay));
}
console.log(`\nXong ${het.size}/${MODELS.length}. Ket qua: bench/ket-qua/`);