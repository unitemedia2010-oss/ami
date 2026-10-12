/**
 * Soát thẻ dự án hiện đúng số TIN ĐĂNG, không phải số toà.
 *
 * ⚠ Vì sao cần:
 *   Thẻ dự án từng hiện `${building_count} toà`. Đó là thông tin của chủ đầu
 *   tư, không phải thứ người đọc trang tin đăng cần — và chỉ 64/441 dự án
 *   có số này, nên 377 thẻ rơi về "Xem tin". Nay hiện số tin đăng.
 *
 *   Script này khẳng định điều đó bằng dữ liệu thật, và bắt trường hợp
 *   ProjectCard quay lại dùng building_count.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const card = readFileSync(join(ROOT, 'web/src/components/ListingCard.tsx'), 'utf8');
const projects = JSON.parse(readFileSync(join(ROOT, 'web/public/data/projects.json'), 'utf8'));

const loi = [];

/* ------------------------------------------- 1. Thẻ KHÔNG dùng building_count */
const khoiThe = card.slice(card.indexOf('export function ProjectCard'));
const dungToa = /\bbuilding_count\b[^?]*\?\s*`?\$\{p\.building_count\}/.test(khoiThe);
if (dungToa) loi.push('ProjectCard vẫn hiện số toà — phải hiện số tin đăng');

/* ------------------------------------- 2. Thẻ CÓ dùng apartment_count */
if (!khoiThe.includes('p.apartment_count')) {
  loi.push('ProjectCard không dùng apartment_count');
}
if (!khoiThe.includes('tin đăng')) {
  loi.push('ProjectCard không hiện nhãn "tin đăng"');
}

/* ------------------------- 3. Dữ liệu: mọi dự án đều tra được về số tin */
const co = projects.filter((p) => p.apartment_count != null).length;
console.log(`  dự án có số tin đăng : ${co}/${projects.length}`);
console.log(`  dự án chưa có tin    : ${projects.length - co}/${projects.length}`);

/* 4. nhãn phải nói thẳng khi chưa có tin, không hứa "Xem tin" rồi ra trang rỗng */
if (khoiThe.includes('>Xem tin<') && !khoiThe.includes('Chưa có tin')) {
  loi.push('nhánh chưa có tin ghi "Xem tin" — sẽ dẫn tới trang không có kết quả');
}

if (loi.length) {
  console.error('\nFAIL:\n  - ' + loi.join('\n  - '));
  process.exit(1);
}
console.log('\nOK: the du an hien so tin dang, khong hien so toa.');
