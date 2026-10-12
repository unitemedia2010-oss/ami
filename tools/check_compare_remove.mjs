/**
 * Soát bảng so sánh có nút XOÁ rõ ràng trên mỗi cột.
 *
 * ⚠ Vì sao cần:
 *   Bảng so sánh chỉ có một dòng chữ nhỏ "Bỏ khỏi so sánh" nằm dưới tiêu
 *   đề. Người dùng báo không thấy cách xoá — dòng chữ đó quá nhỏ và dễ bị
 *   bỏ qua, nhất là khi bảng rộng hơn màn hình phải cuộn ngang.
 *
 *   Nay thêm nút X tròn đỏ trên ảnh mỗi cột, đúng kiểu giỏ so sánh.
 *   Đồng thời bắt buộc có aria-label: nút chỉ chứa icon thì trình đọc màn
 *   hình không đọc được, và nút tim cạnh bên không có nhãn nên rất dễ bấm
 *   nhầm (mình đã bấm nhầm khi kiểm thử).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'web/src/app/so-sanh/page.tsx'), 'utf8');

const loi = [];

const iThead = src.indexOf('<thead>');
const iEnd = src.indexOf('</thead>');
if (iThead < 0 || iEnd < 0) {
  console.error('FAIL: khong tim thay thead — bang so sanh da doi cau truc');
  process.exit(1);
}

/* BO COMMENT TRUOC KHI KIEM — đây là bẫy thật đã xảy ra.
   Nhánh X có một dòng chú thích giải thích con số vị trí nằm NGAY TRƯỚC
   className. Nếu quét thẳng, regex khớp nhầm con số trong CHÚ THÍCH chứ
   không phải trong className: đổi className đi cũng không thấy lỗi, tức
   script im lặng và vô dụng.
   Bỏ comment thật (cả khối và dòng), không lọc theo đầu dòng — dùng cách
   đã áp dụng cho check_posix_paths. */
const thead = src.slice(iThead, iEnd)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/.*$/gm, ' ');

/* 1. có nút X */
if (!/lucide:x/.test(thead)) loi.push('thieu nut X tren anh moi cot');

/* 2. nút X phải CÓ aria-label nói rõ xoá tin nào */
if (!/aria-label=\{`Bỏ khỏi so sánh: /.test(thead)) {
  loi.push('nut X phai co aria-label neu ten tin');
}

/* 3. X không được đè lên nút tim.
      Nút tim (btn-icon) cao 40 px neo ở top-0, nên X phải bắt đầu từ
      44 px. Đặt ở top-9 (36 px) là đè mất 4 px.

      ⚠ Số trong class KHÔNG phải số px: thang giãn Tailwind v3 là 0.25rem
        mỗi đơn vị, tức top-11 = 44 px. So thẳng "11 < 44" là sai. */
const TIM_CAO_PX = 40;
const KHE_PX = 4;
const DON_VI_PX = 4;

const khoiX = thead.slice(thead.indexOf('Bỏ khỏi so sánh: '));
const top = khoiX.match(/(?:^|\s)top-(\d+)\b/);
if (!top) {
  loi.push('khong tim thay vi tri (absolute top-N) cua nut X');
} else {
  const px = Number(top[1]) * DON_VI_PX;
  if (px < TIM_CAO_PX + KHE_PX) {
    loi.push(`nut X o top-${top[1]} = ${px}px se de len nut tim (cao `
      + `${TIM_CAO_PX}px) — can it nhat ${TIM_CAO_PX + KHE_PX}px`);
  }
}

/* 4. vẫn giữ nút chữ để không mất đường vào rõ ràng */
if (!/trash-2/.test(thead)) loi.push('mat nut chu "Bỏ khỏi so sánh"');

/* 5. Nút tim phải có aria để phân biệt khi bấm và khi kiểm thử.
      WatchButton nằm ở file khác nên phải đọc file đó. */
const watch = readFileSync(join(ROOT, 'web/src/components/ListingCard.tsx'), 'utf8');
const khoiWatch = watch.slice(watch.indexOf('export function WatchButton'));
if (!/aria-pressed/.test(khoiWatch)) loi.push('nut tim mat aria-pressed');

if (loi.length) {
  console.error('FAIL:\n  - ' + loi.join('\n  - '));
  process.exit(1);
}
console.log('OK: moi cot so sanh co nut X ro rang, khong de len nut tim.');
