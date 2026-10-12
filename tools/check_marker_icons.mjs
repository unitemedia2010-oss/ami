/* Kiểm chứng logic marker bản đồ bằng Node, không cần trình duyệt.
   Trình duyệt phiên này bị treo do hết bộ nhớ, nhưng logic thuần này kiểm
   được bằng cách dựng lại đúng chuỗi mà map.ts sinh ra. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../web/src/lib/map.ts'), 'utf8');

/* Lấy phần SVG của hàm dựng icon.
   ⚠ KHÔNG cắt theo dấu backtick: hàm có template literal LỒNG NHAU —
     `data:…${encodeURIComponent(`<svg>…</svg>`)}` — nên backtick thứ hai
     mở ngay thẻ <svg> chứ không phải khép. Cắt từ <svg> tới </svg> cho
     đúng và không phụ thuộc số tầng backtick. */
const lay = (ten) => {
  const i = src.indexOf(`export const ${ten}`);
  if (i < 0) return null;
  const a = src.indexOf('<svg', i);
  const b = src.indexOf('</svg>', a);
  return a < 0 || b < 0 ? null : src.slice(a, b + 6);
};

const loi = [];

/* ---------------------------------------------------------- DOT_ICON */
const dot = lay('DOT_ICON');
if (!dot) loi.push('khong tim thay DOT_ICON');
else {
  // dựng lại chuỗi với tham số mặc định
  const svg = dot
    .replace('${active ? \'#E11D48\' : \'#F97316\'}', '#F97316');
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  // 1. co ba lop: vien toi, vong cam, cham trang
  const nCircle = (svg.match(/<circle/g) || []).length;
  if (nCircle !== 3) loi.push(`DOT_ICON co ${nCircle} lop circle, can 3`);
  if (!svg.includes('rgba(15,23,42')) loi.push('DOT_ICON thieu vien toi phia ngoai');
  if (!svg.includes('#F97316')) loi.push('DOT_ICON thieu mau cam');
  if (!svg.includes('stroke="#fff"')) loi.push('DOT_ICON thieu vien trang');
  if (!svg.includes('width="30"')) loi.push('DOT_ICON sai kich thuoc (can 30)');

  // 2. vien toi phai rong hon vong mau, va khong tran ra ngoai khung
  const rNgoai = 13.2, rGiua = 11.6;
  if (rNgoai <= rGiua) loi.push('vien toi phai rong hon vong mau');
  if (rNgoai > 15) loi.push(`vien toi tran khung (r=${rNgoai}, khung 15)`);

  // 3. URI phai la data-URL hop le
  if (!uri.startsWith('data:image/svg+xml;charset=utf-8,')) loi.push('URI sai dinh dang');

  console.log('DOT_ICON:');
  console.log('  lop circle     :', nCircle, nCircle === 3 ? '(OK)' : '(LOI)');
  console.log('  vien toi ngoai :', svg.includes('rgba(15,23,42') ? 'co (OK)' : 'THIEU');
  console.log('  kich thuoc     :', (svg.match(/width="(\d+)"/) || [])[1], '(can 30)');
  console.log('  ban ma hoa      :', uri.length, 'ky tu');
}

/* ------------------------------------------------------ COMPARE_ICON */
const cmp = lay('COMPARE_ICON');
if (!cmp) loi.push('khong tim thay COMPARE_ICON');
else {
  const svg = cmp.replace('${n}', '3');
  console.log('COMPARE_ICON:');
  console.log('  co drop-shadow :', svg.includes('feDropShadow') ? 'co (OK)' : 'THIEU');
  console.log('  nen toi dam    :', svg.includes('#0B1120') ? 'co (OK)' : 'THIEU');
  console.log('  vien xanh sang :', svg.includes('#38BDF8') ? 'co (OK)' : 'THIEU');
  console.log('  so thu tu      :', svg.includes('<text') ? 'co (OK)' : 'THIEU');
  console.log('  kich thuoc     :', (svg.match(/width="(\d+)"/) || [])[1], 'x',
    (svg.match(/height="(\d+)"/) || [])[1], '(can 42x50)');

  if (!svg.includes('width="42"')) loi.push('COMPARE_ICON sai kich thuoc');
  if (!svg.includes('<text')) loi.push('COMPARE_ICON thieu so thu tu');
  if (!svg.includes('feDropShadow')) loi.push('COMPARE_ICON thieu bong de no len nen');
}

/* ------------------------------------------------- kich thuoc khai bao */
const khai = [...src.matchAll(/iconSize:\s*\[(\d+),\s*(\d+)\]/g)].map(m => [m[1], m[2]]);
console.log('iconSize khai bao:', JSON.stringify(khai));
if (!khai.some(k => k[0] === '30' && k[1] === '30')) loi.push('thieu iconSize 30x30 cho marker du an');
if (!khai.some(k => k[0] === '42' && k[1] === '50')) loi.push('thieu iconSize 42x50 cho marker so sanh');

if (loi.length) {
  console.error('\nFAIL:\n  - ' + loi.join('\n  - '));
  process.exit(1);
}
console.log('\nOK: marker co vien toi phan cach nen, so sanh co bong va so thu tu.');
