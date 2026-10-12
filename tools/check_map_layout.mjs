/**
 * Soát bố cục header và bản đồ theo giao diện mẫu.
 *
 * ⚠ Vì sao cần:
 *   1. Header từng có DÃY 23 CHIP QUẬN chiếm nguyên một hàng, xuống còn 2–3
 *      dòng ở màn vừa — nặng và tốn chỗ. Nay gộp thành ô chọn khu vực cạnh
 *      ô tìm kiếm.
 *   2. Bộ lọc bản đồ từng là LƯỚI 5 Ô xuống hàng; phải cuộn qua mới thấy
 *      bản đồ. Nay là MỘT HÀNG ngang cuộn được.
 *   3. Bấm chấm từng mở khối chi tiết NẰM DƯỚI bản đồ; nay mở hộp BÊN
 *      PHẢI, người dùng không mất vị trí đang xem.
 *
 *   Cả ba đều là quyết định bố cục, không ai nhắc lại sau này — script giữ
 *   cho khỏi trôi ngược về kiểu cũ khi ai đó sửa header.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = (f) => readFileSync(join(ROOT, f), 'utf8');
const header = doc('web/src/components/SiteHeader.tsx');
const banDo = doc('web/src/app/ban-do/page.tsx');

const loi = [];

/* ---------------------------------------------------------- 1. HEADER gọn */
if (/nav aria-label="Khu vực"/.test(header)) {
  loi.push('header còn dãy chip quận (nav aria-label="Khu vực") — trở lại bố cục nặng');
}
if (!/id="hd-district"/.test(header)) {
  loi.push('header thiếu ô chọn khu vực thay cho dãy chip');
}
/* Ô chọn phải nằm TRONG form cùng ô tìm kiếm để submit ra cả hai điều kiện. */
const selectIdx = header.indexOf('id="hd-district"');
const formIdx = header.lastIndexOf('<form', selectIdx);
const closeForm = header.indexOf('</form>', selectIdx);
if (formIdx < 0 || closeForm < 0 || closeForm < selectIdx) {
  loi.push('ô chọn khu vực nằm NGOÀI form tìm kiếm — sẽ không lọc được theo quận');
}

/* ------------------------------------------------- 2. BỘ LỌC MỘT HÀNG */
if (/grid sm:grid-cols-2 lg:grid-cols-5/.test(banDo)) {
  loi.push('bo loc ban do lai la luoi 5 o xuong hang — phai cuon qua moi thay ban do');
}
if (!/overflow-x-auto no-scrollbar/.test(banDo)) {
  loi.push('thanh loc ban do phai la MOT HANG cuon ngang');
}

/* ------------------------------------------- 3. HỘP CHỌN BÊN PHẢI */
if (!/lg:grid-cols-\[1fr_370px\]/.test(banDo)) {
  loi.push('ban do phai co hai cot: ban do + hop chi tiet ben phai');
}
if (!/<aside/.test(banDo)) {
  loi.push('hop chi tiet phai la <aside> de gan chieu cao va cuon rieng');
}
/* Hộp phải mở khi bấm chấm, không phải điều hướng sang trang khác. */
if (!/onSelect=\{\(p\) => \{[\s\S]{0,200}setPicked\(/.test(banDo)) {
  loi.push('bam cham phai setPicked (mo hop ben phai), khong du dieu huong');
}

if (loi.length) {
  console.error('FAIL:\n  - ' + loi.join('\n  - '));
  process.exit(1);
}
console.log('OK: header gon, bo loc mot hang, hop chi tiet ben phai.');
