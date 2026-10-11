/** Kiểm tra bản build: sau khi bỏ dãy chip "Tìm nhanh", còn gì trong HTML. */
import { readFileSync } from 'node:fs';

const h = readFileSync('web/out/index.html', 'utf8');

/* ------------------------------------------------- mục SEO cuối trang */
const j = h.lastIndexOf('Tìm nhà đất TP.HCM');
const seg = h.slice(j, j + 8000);
const qs = [...seg.matchAll(/href="\/ami\/tim-kiem\/\?q=([^"]+)"/g)].map((m) => decodeURIComponent(m[1]));
console.log(`mục SEO cuối trang — chip (${qs.length}): ${qs.join(' | ')}`);
console.log(`  có nút "Tất cả khu vực": ${seg.includes('Tất cả khu vực')}`);
console.log(`  link tới /ami/quan: ${/href="\/ami\/quan\/?"/.test(seg)}`);

/* ------------------------------------------------------ bảng đầu trang */
console.log(`còn bảng "Tìm nhanh" ở đầu trang: ${h.includes('Tìm nhanh')}`);

/* Lấy đúng <span> chứa "TP. Hồ Chí Minh" rồi xem class của nó */
const i = h.indexOf('TP. Hồ Chí Minh');
const start = h.lastIndexOf('<span', i);
const openTag = h.slice(start, i);
const cls = (openTag.match(/class="([^"]*)"/) || [, ''])[1];
console.log(`\nbadge "TP. Hồ Chí Minh"`);
console.log(`  class: ${cls.replace(/\s+/g, ' ').trim()}`);
console.log(`  có text-white: ${/\btext-white\b/.test(cls)}`);