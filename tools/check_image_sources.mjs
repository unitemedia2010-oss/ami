/**
 * Kiểm tra xem có nguồn ảnh nào tốt hơn cho thẻ dự án không.
 *
 * Câu hỏi: ảnh của một tin đăng (chụp căn hộ cụ thể) có được dùng làm ảnh
 * đại diện của dự án không? Về mặt ngữ nghĩa thì không — người xem tưởng đó
 * là ngoại hình toàn khu chứ không phải căn hộ thật.
 */
import { readFileSync, existsSync } from 'node:fs';

console.log('=== 1. các file dữ liệu trong thư mục có trường ảnh nào ===');
for (const f of ['all-listings.json', 'all-enriched.json', 'all-merged.json', 'thu-thiem-can-ho.json']) {
  if (!existsSync(f)) { console.log(`  ${f}: không có`); continue; }
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    const list = Array.isArray(j) ? j : (j.data || j.items || []);
    if (!Array.isArray(list) || !list.length) { console.log(`  ${f}: cấu trúc lạ`); continue; }
    const keys = Object.keys(list[0]);
    const anhKeys = keys.filter((k) => /anh|image|img|photo|media|gal/i.test(k));
    console.log(`  ${f}: ${list.length} bản ghi · trường ảnh: ${anhKeys.join(', ') || '(không có)'}`);
    for (const k of anhKeys) {
      const v = list.find((x) => x[k]);
      console.log(`     "${k}" ví dụ: ${JSON.stringify(v?.[k]).slice(0, 130)}`);
    }
  } catch (e) { console.log(`  ${f}: lỗi đọc — ${e.message.slice(0, 50)}`); }
}

/* có nhiều ảnh trong 1 tin không? */
console.log('\n=== 2. all-enriched.json có nhiều ảnh mỗi tin không? ===');
if (existsSync('all-enriched.json')) {
  const j = JSON.parse(readFileSync('all-enriched.json', 'utf8'));
  const list = Array.isArray(j) ? j : (j.data || j.items || []);
  const coAnh = list.filter((x) => x.anh);
  const dau = coAnh.slice(0, 3).map((x) => String(x.anh).slice(0, 100));
  console.log(`  ${coAnh.length}/${list.length} tin có trường "anh"`);
  dau.forEach((d, i) => console.log(`     ${i + 1}. ${d}`));
  // tìm mọi trường chứa nhiều URL
  const nhieuUrl = Object.keys(list[0]).filter((k) => Array.isArray(list[0][k]));
  console.log(`  trường dạng mảng: ${nhieuUrl.join(', ') || '(không có)'}`);
}