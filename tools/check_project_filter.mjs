/* Kiểm chứng bằng DỮ LIỆU THẬT: bộ lọc `?project=` sau khi sửa có ra
   đúng số tin của dự án không, và khớp con số popup trên bản đồ.
   Chạy lại đúng thuật toán trong staticData.ts. */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = join(dirname(fileURLToPath(import.meta.url)), '../web/public/data');
const projects = JSON.parse(readFileSync(join(D, 'projects.json'), 'utf8'));

const fold = (s) => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/\s+/g, ' ').trim();

const byName = new Map(
  projects.filter((x) => x.name)
    .map((x) => [(x.name || '').trim().toLowerCase(), x]),
);

const shards = readdirSync(join(D, 'd'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(D, 'd', f), 'utf8')))
  .flat();

let loi = 0;
const kiem = [];

for (const ma of ['prj-x40', 'prj-x247', 'prj-x1']) {
  const p = projects.find((x) => x.id === ma);
  if (!p) { kiem.push(`${ma}: KHONG TON TAI`); loi++; continue; }

  // ---- thuat toan MOI trong staticData.ts ----
  const key = byName.get((p.name || '').trim().toLowerCase())?.name ?? ma;
  const rows = shards.filter((l) => fold(l.project_name).includes(fold(key)));

  // ---- so voi con so popup tren ban do ----
  const ghi = p.apartment_count || 0;

  const dung = rows.length === ghi;
  if (!dung) loi++;
  kiem.push({
    ma, ten: p.name,
    'tin loc ra': rows.length,
    'popup ghi': ghi,
    khop: dung ? 'DUNG' : 'SAI',
  });
}

/* Kiem tra nhanh: mot du an lon co ra khong phai toan bo tin */
const lon = kiem.find((k) => typeof k === 'object' && k['tin loc ra'] > 1000);
if (lon) loi++;

console.table(kiem.filter((k) => typeof k === 'object'));

if (lon) {
  console.error(`\nFAIL: ${lon.ma} tra ${lon['tin loc ra']} tin — bo loc khong hoat dong.`);
}
if (loi) {
  console.error(`\n${loi} truong hop sai.`);
  process.exit(1);
}
console.log('\nOK: moi du an tra ra dung so tin, khong con lo ra toan bo 27.659 tin.');
