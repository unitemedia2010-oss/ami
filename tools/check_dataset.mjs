/** Kiểm tra nhanh dataset: phân bố quận, tìm tên quận cũ, giá trị rác. */
import { buildDataset, findDistricts, fold } from '../workers/mock/dataset.mjs';

/* ---------------------------------------------------------------------------
 *  Tự kiểm tra hàm bỏ dấu TRƯỚC KHI xem dữ liệu.
 *
 *  Lý do phải có: hàm bỏ dấu từng bị hỏng vì dải ký tự tổ hợp U+0300–U+036F
 *  bị biến thành ký tự khác khi ghi file. Biểu thức trông vẫn "hợp lệ" nên
 *  không ai báo lỗi, nhưng mọi tìm kiếm tiếng Việt không dấu đều trả 0 kết quả.
 *  Dùng dạng \u0300-\u036f (chỉ ASCII) để không thể hỏng lần nữa.
 * ------------------------------------------------------------------------- */
const FOLD_CASES = [
  ['Gò Vấp', 'go vap'],
  ['Quận Bình Thạnh', 'quan binh thanh'],
  ['Nguyễn Đình Chiểu', 'nguyen dinh chieu'],
  ['Đống Đa', 'dong da'],
  ['Hà Nội', 'ha noi'],
  ['Thủ Đức', 'thu duc'],
  ['Phú Nhuận', 'phu nhuan'],
];
let foldFail = 0;
for (const [raw, want] of FOLD_CASES) {
  const got = fold(raw);
  if (got !== want) { console.log(`  ✗ fold("${raw}") = "${got}", cần "${want}"`); foldFail++; }
}
console.log(foldFail
  ? `  ✗ HÀM BỎ DẤU HỎNG (${foldFail}/${FOLD_CASES.length} ca sai) — tìm kiếm sẽ không bao giờ ra kết quả`
  : `  ✓ bỏ dấu đúng ${FOLD_CASES.length}/${FOLD_CASES.length} ca`);
if (foldFail) process.exitCode = 1;

const ds = buildDataset();

const m = {};
for (const l of ds.listings) m[l.district_id ?? 'null'] = (m[l.district_id ?? 'null'] || 0) + 1;
console.log('listings theo district_id:', JSON.stringify(m));
console.log('projects:', ds.projects.length, '· listings:', ds.listings.length,
  '· có toạ độ:', ds.mapProjects.length);

for (const q of ['go vap', 'Gò Vấp', 'q1', 'Quận 1', 'td1', 'phu nhuan', 'tan binh', 'Không Có Quận Này']) {
  console.log(`  tìm "${q}" -> ${JSON.stringify(findDistricts(ds.districts, q).map((d) => d.name_new))}`);
}

// giá luôn phải là TRIỆU: bán >= 1000 tỷ, thuê < 1000
const sell = ds.listings.filter((l) => l.type === 'sell').map((l) => l.price);
const rent = ds.listings.filter((l) => l.type === 'rent').map((l) => l.price);
console.log(`  giá bán  : ${Math.min(...sell)} – ${Math.max(...sell)} triệu`);
console.log(`  giá thuê : ${Math.min(...rent)} – ${Math.max(...rent)} triệu/tháng`);
console.log('  CẢNH BÁO: bán có tin < 1000 triệu không?',
  sell.filter((p) => p < 1000).length, 'tin (0 là đúng)');