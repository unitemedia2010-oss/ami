/**
 * Soát lớp Tailwind trong bản build: phát hiện class KHÔNG được sinh ra.
 *
 * ⚠ Vì sao cần:
 *   Tailwind KHÔNG báo lỗi khi gặp class không hợp lệ. `bg-white/12` từng
 *   biến mất âm thầm — build vẫn báo thành công, chỉ là không có nền.
 *   Đã gặp đúng lỗi đó ở dự án này và mất thời gian tìm hiểu vì sao màu
 *   "bị mờ". Script này chặn việc đó tái diễn.
 *
 *   Bài học khi viết script này (lần đầu sai):
 *   Trong file CSS, Tailwind ghi class có dấu gạch chéo trước dấu gạch:
 *       .bg-black\/35
 *   Regex phải khớp cả dấu `\`. Regex `\/` đơn thuần sẽ không khớp, khiến
 *   script báo nhầm hàng loạt class vốn hoàn toàn hợp lệ.
 *
 *   Cách dùng:  node tools/check_tailwind_classes.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'web/out');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/* ---------------------------------------------------- 1. gom mọi class có trong CSS */

/* ⚠ PHẢI CẢNH BÁO KHI BẢN BUILD CŨ HƠN MÃ NGUỒN.
   Script này đối chiếu mã nguồn với CSS trong web/out. Nếu web/out là bản
   build cũ hơn, mọi class viết MỚI đều vắng mặt và script báo động giả —
   kể cả class hoàn toàn hợp lệ.

   Đã vấp đúng lỗi này: sau khi thêm class mới ở trang chủ, script báo
   "border-gold-400/50 không có trong bản build". Đổi /40 → /50 cũng vô ích.
   Kiểm lại thì ngay cả `bg-white/50` (chắc chắn hợp lệ) cũng "không có" —
   dấu hiệu duy nhất là bản build cũ, không phải class sai.

   Trong CI thì không dính (build chạy ngay trước bước soát), nhưng trên máy
   thì thường xuyên dính. Không cảnh báo thì người ta sẽ mất thời gian sửa
   những thứ vốn đã đúng. */
let buildCu = 0;
let nguonMoiNhat = 0;
try { buildCu = statSync(OUT).mtimeMs; } catch { /* chưa build */ }
for (const f of walk(join(process.cwd(), 'web/src'))) {
  if (!/\.(tsx?|css)$/.test(f)) continue;
  try { const t = statSync(f).mtimeMs; if (t > nguonMoiNhat) nguonMoiNhat = t; } catch {}
}

const buildCuHon = buildCu > 0 && nguonMoiNhat > buildCu;

const css = walk(join(OUT, '_next'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

if (buildCuHon) {
  console.log('⚠ CẢNH BÁO: web/out CŨ HƠN mã nguồn — kết quả dưới đây KHÔNG ĐÁNG TIN.');
  console.log('  Script đối chiếu mã nguồn với CSS của bản build cũ, nên mọi class');
  console.log('  viết mới đều bị báo "không có" oan. Hãy `npm run build` lại rồi');
  console.log('  chạy script này. Trong CI bước soát luôn chạy sau build nên không dính.\n');
}

const inCss = new Set();
for (const m of css.matchAll(/\.((?:[A-Za-z0-9_-]|\\.)+)/g)) {
  // bỏ dấu `\` mà Tailwind chèn để escape ký tự đặc biệt trong selector
  inCss.add(m[1].replace(/\\/g, ''));
}

/** Class có tồn tại không, kể cả khi chỉ xuất hiện dưới dạng biến thể
 *  (hover: / focus: / md: …). Selector biến thể trong CSS là
 *  `.hover\:bg-white\/15:hover` — tên class vẫn nằm trong tập, chỉ có tiền tố. */
function has(cls) {
  if (inCss.has(cls)) return true;
  for (const k of inCss) if (k.endsWith(':' + cls)) return true;
  return false;
}

/** Xoá khối `@apply …;` kể cả khi trải nhiều dòng. Tailwind khai triển thẳng
 *  các class ở đây thành khai báo CSS nên chúng KHÔNG tồn tại dưới dạng
 *  selector riêng — quét chúng sẽ báo nhầm là "Tailwind đã bỏ". */
function stripApply(src) {
  return src.replace(/@apply\b[^;]*;/g, ' ');
}

/* ---------------------------------- 2. gom class dạng <tiền tố>-<màu>/<opacity> */
// Trong mã nguồn class KHÔNG có dấu `\`, nên không cần escape khi so khớp.
const PRE = '(?:bg|text|border|from|via|to|ring|fill|stroke|shadow|divide|placeholder)-[a-z0-9-]+';
const re = new RegExp('\\b(' + PRE + ')/(\\d{1,3})\\b', 'g');

const missing = new Map();
for (const file of walk(join(ROOT, 'web/src'))) {
  if (!/\.(tsx?|css)$/.test(file)) continue;
  stripApply(readFileSync(file, 'utf8')).split('\n').forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      const cls = `${m[1]}/${m[2]}`;
      if (has(cls)) continue;
      if (!missing.has(cls)) missing.set(cls, `${file.replace(ROOT + '\\', '')}:${i + 1}`);
    }
  });
}

/* ------------------------------------------------------------- 3. kết quả */
const total = new Set();
for (const f of walk(join(ROOT, 'web/src'))) {
  if (!/\.(tsx?|css)$/.test(f)) continue;
  for (const m of readFileSync(f, 'utf8').matchAll(re)) total.add(`${m[1]}/${m[2]}`);
}

/* Build cũ thì kết quả không đáng tin, nên THOÁT SẠCH chứ không báo lỗi —
   báo lỗi oan khiến CI/người dùng phải đi sửa những class vốn đã đúng. */
if (buildCuHon) process.exit(0);

if (missing.size === 0) {
  console.log(`OK: cả ${total.size} lớp dạng <màu>/<opacity> đều có trong bản build.`);
} else {
  console.log(`✗ ${missing.size}/${total.size} lớp KHÔNG có trong bản build (Tailwind đã âm thầm bỏ):\n`);
  for (const [cls, where] of [...missing].sort()) console.log(`   ${cls.padEnd(24)} ${where}`);
  console.log('\nSửa: dùng số có trong thang opacity của Tailwind v3 (bội số 5 từ 0 đến 100),');
  console.log('     hoặc dạng ngoặc vuông cho số bất kỳ:  bg-black/[0.35]');
  process.exitCode = 1;
}