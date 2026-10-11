/**
 * Trang /du-an dùng projects.json (lấy từ PDF — không có ảnh nào).
 * Nhưng dataset 27k có ảnh thật và 3.044 tin có tên dự án ở trường `duAn`.
 * Kiểm tra: có gắn được ảnh tin lên thẻ dự án không?
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();

const projects = JSON.parse(readFileSync('web/public/data/projects.json', 'utf8'));
console.log(`dự án trong projects.json: ${projects.length}`);
console.log(`  có hero_image: ${projects.filter((p) => p.hero_image).length}\n`);

/* gom ảnh theo tên dự án từ 27k */
const anhTheoTen = new Map();
const soTin = new Map();
let coDa = 0;
for (const f of readdirSync('web/public/data/d')) {
  for (const x of JSON.parse(readFileSync(join('web/public/data/d', f), 'utf8'))) {
    const da = (x.project_name || '').trim();
    if (!da) continue;
    coDa++;
    const k = fold(da);
    soTin.set(k, (soTin.get(k) || 0) + 1);
    if (x.image && !anhTheoTen.has(k)) anhTheoTen.set(k, x.image);
  }
}
console.log(`tin 27k có tên dự án: ${coDa}`);
console.log(`suy ra được ${soTin.size} dự án khác nhau, ${anhTheoTen.size} có ảnh\n`);

/* khớp tên dự án của PDF với dự án trong 27k */
let khop = 0, khopAnh = 0;
const viDu = [];
for (const p of projects) {
  const k = fold(p.name);
  if (soTin.has(k)) {
    khop++;
    if (anhTheoTen.has(k)) khopAnh++;
    if (viDu.length < 6) viDu.push(`${p.name}  ← khớp, ${soTin.get(k)} tin`);
  } else if (viDu.length < 6) {
    viDu.push(`${p.name}  ← không khớp`);
  }
}
console.log(`khớp chính xác: ${khop}/${projects.length} (có ảnh: ${khopAnh})`);
console.log('\nví dụ:'); viDu.forEach((v) => console.log('  ' + v));

/* gần đúng: khớp nếu một tên chứa tên kia */
let gan = 0, ganAnh = 0;
for (const p of projects) {
  if (soTin.has(fold(p.name))) continue;
  const k = fold(p.name);
  for (const t of soTin.keys()) {
    if (t.includes(k) || k.includes(t)) {
      gan++;
      if (anhTheoTen.has(t)) ganAnh++;
      break;
    }
  }
}
console.log(`\nkhớp gần đúng (một tên chứa tên kia): thêm ${gan} (có ảnh: ${ganAnh})`);
console.log(`=> tổng có thể gắn ảnh: ${khopAnh + ganAnh}/${projects.length}`);

/* dự án lớn nhất trong 27k */
const top = [...soTin].sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log('\n=== 10 dự án có nhiều tin nhất trong 27k ===');
for (const [k, n] of top) console.log(`  ${String(n).padStart(4)} tin  ${k}${anhTheoTen.has(k) ? '  [có ảnh]' : ''}`);