#!/usr/bin/env node
/**
 * HỢP NHẤT nhiều file JSON của scrape.js thành 1 dataset (loại trùng theo id).
 *
 * Lý do cần: backend chỉ sort được theo `postedAtTimestamp` hoặc `gia`.
 * Khi sort theo 1 trường không phải khoá duy nhất, phân trang bị "trôi":
 * cùng 1 tin có thể lặp ở trang này, thiếu ở trang kia. Quét nhiều kiểu sort
 * rồi hợp nhất theo id là cách bù cho phần thiếu.
 *
 * Dùng:  node merge.js all-listings.json pass-gia-desc.json pass-gia-asc.json
 *         node merge.js *.json --out=all-merged.json --csv=all-merged.csv
 */
const fs = require('fs');

const argv = process.argv.slice(2);
const files = argv.filter(a => !a.startsWith('--'));
const argOf = (k, d) => { const h = argv.find(a => a.startsWith(`--${k}=`)); return h ? h.split('=').slice(1).join('=') : d; };

if (!files.length) {
  console.error('✖ Cần ít nhất 1 file JSON. Ví dụ: node merge.js a.json b.json --out=all.json');
  process.exit(1);
}

const map = new Map();
const missing = [];
for (const f of files) {
  try {
    const rows = JSON.parse(fs.readFileSync(f, 'utf8'));
    let added = 0;
    for (const r of rows) {
      if (r && r.id && !map.has(r.id)) { map.set(r.id, r); added++; }
    }
    console.error(`  ${f}: ${rows.length} dòng → thêm ${added} mới`);
  } catch (e) {
    missing.push(`${f} (${e.message})`);
  }
}
if (missing.length) console.error('⚠ Bỏ qua file lỗi:', missing.join('; '));

const merged = [...map.values()];
// sắp xếp mới nhất trước
merged.sort((a, b) => String(b.ngayDangISO || '').localeCompare(String(a.ngayDangISO || '')));

const out = argOf('out', 'all-merged.json');
fs.writeFileSync(out, JSON.stringify(merged, null, 0), 'utf8');
console.error(`\n✔ Hợp nhất ${merged.length} tin duy nhất → ${out}`);

const csvOut = argOf('csv', '');
if (csvOut) {
  const cols = ['id', 'giaHienThi', 'hinhThuc', 'loaiHinhNha', 'quan', 'phuong', 'duong', 'duAn',
    'soPhongNgu', 'soTang', 'ngayDangISO', 'link'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;
  const csv = '\ufeff' + [cols.join(','), ...merged.map(r => cols.map(c => q(r[c])).join(','))].join('\n');
  fs.writeFileSync(csvOut, csv, 'utf8');
  console.error(`✔ CSV: ${csvOut} (${merged.length} dòng)`);
}