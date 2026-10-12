/**
 * Soát danh sách khu vực trong ô chọn có ĐỌC ĐƯỢC không.
 *
 * ⚠ Đã xảy ra thật trên bản live:
 *   <select> đặt class `text-white` (đúng — nó nằm trên nền header tối).
 *   Nhưng màu đó KẾ THỪA xuống <option>. Khi mở dropdown, trình duyệt vẽ
 *   nền TRẮNG cho danh sách (theo hệ điều hành) nhưng chữ vẫn trắng →
 *   trắng trên trắng, không đọc được gì.
 *
 *   Bài học: bản màu của <select> KHÔNG kiểm soát được màu <option>.
 *   Phải ép riêng cho option.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'web/src/components/SiteHeader.tsx'), 'utf8');

/* ------------------------------- độ sáng và tương phản theo công thức WCAG */
function lum(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function tuongPhan(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const loi = [];

const i = src.indexOf('const SELECT_CLASS');
const j = src.indexOf(';', i);
const khoi = src.slice(i, j);

/* 1. phải có nền sáng cho option — trình duyệt vẽ nền trắng */
if (!/\[&>option\]:bg-(white|cream)/.test(khoi)) {
  loi.push('<option> chua duoc ep nen sang — danh sach se nen trang mac dinh');
}

/* 2. chữ của option phải TỐI */
const mauChu = khoi.match(/\[&>option\]:text-([a-z0-9-]+)/);
if (!mauChu) {
  loi.push('<option> chua duoc ep mau chu rieng — se ke thua text-white cua select');
} else if (/white/.test(mauChu[1])) {
  loi.push('chu <option> dang la TRANG — se trang tren trang, khong doc duoc');
}

/* 3. so tương phản thực tế của cặp màu đang dùng */
const NEN = [255, 255, 255];                     // bg-white
const CHU_COAL = [28, 25, 23];                  // text-coal-900
const tp = tuongPhan(NEN, CHU_COAL);
console.log(`  nền option #fff / chu #${CHU_COAL.join('')}`);
console.log(`  tương phản: ${tp.toFixed(2)} : 1`);

/* Ngưỡng: 4.5:1 cho chữ thường theo WCAG AA. Danh sách chọn khu vực là
   thứ người dùng hay BẤM, không phải trang trí, nên lấy mức chữ thường. */
if (tp < 4.5) loi.push(`tương phản ${tp.toFixed(2)} < 4.5`);

if (loi.length) {
  console.error('\nFAIL:\n  - ' + loi.join('\n  - '));
  process.exit(1);
}
console.log('\nOK: danh sách khu vực đọc được.');
