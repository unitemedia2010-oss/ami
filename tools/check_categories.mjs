/** 27.659 tin đó là loại nhà nào? Có phải toàn căn hộ không? */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const D = 'web/public/data/d';
const tong = new Map();
let n = 0;

for (const f of readdirSync(D)) {
  const list = JSON.parse(readFileSync(join(D, f), 'utf8'));
  for (const x of list) {
    n++;
    const k = x.category_raw || '(trống)';
    tong.set(k, (tong.get(k) || 0) + 1);
  }
}

console.log(`tổng ${n} tin\n`);
console.log('=== theo loaiHinhNha goc (chua gop nhom) ===');
for (const [k, v] of [...tong].sort((a, b) => b[1] - a[1]).slice(0, 18)) {
  console.log(`  ${String(v).padStart(6)}  ${(v / n * 100).toFixed(1).padStart(5)}%  ${k}`);
}

/* sau khi gom nhóm */
const nhom = new Map();
for (const f of readdirSync(D)) {
  for (const x of JSON.parse(readFileSync(join(D, f), 'utf8'))) {
    nhom.set(x.category, (nhom.get(x.category) || 0) + 1);
  }
}
console.log('\n=== sau khi gom nhom ===');
const NN = {
  'chung-cu': 'Căn hộ chung cư', 'nha-pho': 'Nhà phố / nhà hẻm', dat: 'Đất',
  'mat-bang': 'Mặt bằng kinh doanh', shophouse: 'Shophouse', 'biet-thu': 'Biệt thự',
  'van-phong': 'Văn phòng / tòa nhà', khac: 'Khác',
};
for (const [k, v] of [...nhom].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(6)}  ${(v / n * 100).toFixed(1).padStart(5)}%  ${NN[k] || k}`);
}

const cc = nhom.get('chung-cu') || 0;
console.log(`\n=== KẾT LUẬN ===`);
console.log(`  Căn hộ chung cư : ${cc} tin (${(cc / n * 100).toFixed(1)}%)`);
console.log(`  Không phải CC   : ${n - cc} tin (${((n - cc) / n * 100).toFixed(1)}%)`);

/* có ảnh không */
let coAnh = 0, ccCoAnh = 0;
for (const f of readdirSync(D)) {
  for (const x of JSON.parse(readFileSync(join(D, f), 'utf8'))) {
    if (x.image) { coAnh++; if (x.category === 'chung-cu') ccCoAnh++; }
  }
}
console.log(`\n  có ảnh thật : ${coAnh}/${n}`);
console.log(`  căn hộ có ảnh: ${ccCoAnh}/${cc}`);

/* featured đang chọn gì */
const idx = JSON.parse(readFileSync('web/public/data/index.json', 'utf8'));
const fc = new Map();
for (const x of idx.featured) fc.set(x.category, (fc.get(x.category) || 0) + 1);
console.log(`\n=== 48 tin nổi bật trên trang chủ ===`);
for (const [k, v] of fc) console.log(`  ${v}  ${NN[k] || k}`);