/**
 * Soát lớp tương phản: chữ trên nền tối mà KHÔNG có màu chữ tương minh.
 *
 * ⚠ Vì sao cần:
 *   Đã có một lần giao diện hiện dãy chip nền kính tối với chữ ĐEN — không
 *   đọc được. Nguyên nhân: class `text-white` bị quên, nên chữ kế thừa màu
 *   mặc định của trang (gần như đen) trong khi nền là gradient đậm.
 *   Build vẫn thành công, không có cảnh báo nào.
 *
 *   Nhận biết: phần tử có nền tối (bg-gradient tối, glass-dark, bg-black…)
 *   mà className KHÔNG chứa bất kỳ class text- nào (kể cả hover:/focus:)
 *   và không phải <button> (mặc định đã có màu riêng).
 *
 *   Cách dùng:  node tools/check_contrast_classes.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'web/src');

// class nền tối — nếu dùng mà nền sáng thì chữ mặc định không sao
const DARK_BG = /\b(?:bg-black|bg-coal-|glass-dark|bg-grad-heat|bg-flame-[789]00|bg-amber-900)/;
const HAS_TEXT = /\btext-[a-z]/;

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const suspects = [];

for (const file of walk(SRC)) {
  if (!/\.tsx$/.test(file)) continue;
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    // gom className có thể trải nhiều dòng: từ className= tới dấu >
    if (!/className=/.test(line)) return;
    let chunk = line;
    let j = i;
    while (!/>$/.test(chunk.trim()) && j + 1 < lines.length && j - i < 8) {
      j++;
      chunk += '\n' + lines[j];
    }
    if (!DARK_BG.test(chunk)) return;
    if (HAS_TEXT.test(chunk)) return;

    // <button> và <a> thường đã có màu chữ từ lớp cha — bỏ qua <button>
    if (/<\s*button\b/.test(chunk)) return;

    const m = chunk.match(/className="([^"]*)"/) || chunk.match(/className=\{`([^`]*)`\}/);
    suspects.push({
      file: file.replace(process.cwd() + '\\', ''),
      line: i + 1,
      cls: (m ? m[1] : chunk).replace(/\s+/g, ' ').trim().slice(0, 70),
    });
  });
}

if (suspects.length === 0) {
  console.log('OK: không có phần tử nền tối nào thiếu màu chữ tường minh.');
} else {
  console.log(`✗ ${suspects.length} chỗ có nền tối nhưng không khai báo màu chữ:\n`);
  for (const s of suspects) console.log(`   ${s.file}:${s.line}\n      ${s.cls}\n`);
  console.log('Cách sửa: thêm `text-white` (hoặc `hover:text-white` nếu chỉ lúc hover).');
  process.exitCode = 1;
}