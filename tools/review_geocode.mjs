/**
 * =============================================================================
 *  BẢNG ĐỐI CHIẾU TOẠ ĐỘ — mở ra bằng Google Maps để kiểm bằng mắt.
 *
 *  Nominatim là dữ liệu cộng tác, không bảo đảm 100%. Ca nào đúng thì chỉ
 *  cần mở link, thấy đúng tên chung cư ở đúng chỗ là được. Ca nào sai thì
 *  báo lại tên dự án — mình loại nó khỏi bản đồ.
 *
 *  Cách dùng:
 *    node tools/review_geocode.mjs              → in bảng ra màn hình
 *    node tools/review_geocode.mjs --csv        → ghi tools/kiem-tra-toa-do.csv
 *    node tools/review_geocode.mjs --top 30     → chỉ 30 ca có điểm cao nhất
 * ========================================================================== */

import { readFileSync, writeFileSync } from 'node:fs';

const kq = JSON.parse(readFileSync('tools/projects-coords.json', 'utf8'));
const proj = JSON.parse(readFileSync('tools/projects.json', 'utf8'));
const ten = new Map(proj.map((p) => [(p.name || '').trim(), p]));

const argv = process.argv.slice(2);
const TOP = argv.includes('--top') ? +argv[argv.indexOf('--top') + 1] : Infinity;

const ok = Object.entries(kq).filter(([, v]) => v.ok)
  .sort((a, b) => b[1].diem - a[1].diem);
const fail = Object.entries(kq).filter(([, v]) => !v.ok);

const link = (v) => `https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}`;

const dong = ([name, v]) => {
  const p = ten.get(name);
  return {
    ten: name,
    lat: v.lat,
    lng: v.lng,
    diem: v.diem,
    nguon: v.nguon,
    lechTamQuanKm: v.cachQuanKm,
    diaChiPDF: p?.address || '',
    quậnPDF: p?.district || '',
    osm: v.osmt,
    googleMaps: link(v),
  };
};

const hang = ok.slice(0, TOP).map((e) => dong(e));

if (argv.includes('--csv')) {
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = [
    ['Dự án', 'Lat', 'Lng', 'Điểm', 'Nguồn', 'Lệch tâm quận (km)',
     'Địa chỉ trong PDF', 'Quận trong PDF', 'OSM trả về', 'Link Google Maps', 'Đúng?'],
    ...hang.map((r) => [r.ten, r.lat, r.lng, r.diem, r.nguon, r.lechTamQuanKm,
      r.diaChiPDF, r.quậnPDF, r.osm, r.googleMaps, '']),
  ].map((r) => r.map(esc).join(',')).join('\n');
  // thêm BOM để Excel mở đúng tiếng Việt
  writeFileSync('tools/kiem-tra-toa-do.csv', '﻿' + csv, 'utf8');
  console.log(`đã ghi tools/kiem-tra-toa-do.csv (${hang.length} dòng)`);
  console.log('mở bằng Excel, cột "Đúng?" để bạn đánh dấu');
} else {
  console.log(`đã định vị ${ok.length}/${Object.keys(kq).length} dự án\n`);
  console.log('=== CẦN BẠN KIỂM ===');
  for (const r of hang) {
    console.log(`\n${r.ten}`);
    console.log(`  toạ độ   : ${r.lat}, ${r.lng}   (điểm ${r.diem}, nguồn ${r.nguon})`);
    console.log(`  PDF      : ${r.diaChiPDF || '(không có)'} — ${r.quậnPDF || '(không có quận)'}`);
    console.log(`  OSM thấy : ${r.osm}`);
    console.log(`  mở map   : ${r.googleMaps}`);
  }
}

console.log(`\n\n=== CHƯA TÌM ĐƯỢC (${fail.length}) — tạm đặt ở tâm quận, không hiện trên bản đồ ===`);
for (const [n] of fail) console.log(`  ${n}`);