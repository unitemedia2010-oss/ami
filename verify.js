#!/usr/bin/env node
/**
 * KIỂM CHỨNG ĐỘ CHÍNH XÁC dữ liệu đã cào.
 *
 * Cách làm: lấy ngẫu nhiên N tin từ file JSON, gọi lại API với đúng mã tin đó
 * (filter_by id:=...), rồi so từng trường xem có khớp không.
 * Nếu khớp -> dữ liệu đã cào là đúng thật, không phải suy diễn.
 *
 * Dùng: node verify.js all-listings.json --sample=15
 *       node verify.js all-listings.json --sample=15 --seed=42   (tái lập kết quả)
 */
const fs = require('fs');
const BASE = 'https://khonhachinhchu.as.r.appspot.com/api/search-listings';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const argv = process.argv.slice(2);
const file = argv.find(a => !a.startsWith('--'));
const argOf = (k, d) => { const h = argv.find(a => a.startsWith(`--${k}=`)); return h ? h.split('=')[1] : d; };
const N = parseInt(argOf('sample', '15'), 10);
const SEED = argOf('seed', null);

// bộ sinh số ngẫu nhiên có seed (tái lập được kết quả)
let seed = SEED ? parseInt(SEED, 10) : Math.floor(Math.random() * 2 ** 31);
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const rows = JSON.parse(fs.readFileSync(file, 'utf8'));

// chọn mẫu ngẫu nhiên
const pool = rows.slice();
const sample = [];
while (sample.length < N && pool.length) {
  sample.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
}

async function fetchLive(id) {
  const url = `${BASE}?q=*&filter_by=${encodeURIComponent(`id:=${id}`)}&per_page=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return (j.hits && j.hits[0]) ? j.hits[0].document : null;
}

const FIELDS = [
  ['gia', 'giaTrieu'], ['hinhThucGiaoDich', 'hinhThuc'], ['quan', 'quan'], ['phuong', 'phuong'],
  ['duong', 'duong'], ['duan', 'duAn'], ['soPhongNgu', 'soPhongNgu'], ['sotang', 'soTang'],
  ['loaiHinhNha', 'loaiHinhNha'], ['imageUrl', 'anh'],
];

(async () => {
  console.error(`File      : ${file} (${rows.length} tin)`);
  console.error(`Mẫu ngẫu nhiên: ${sample.length} tin   seed=${seed}`);
  console.error('');

  let ok = 0, fail = 0, missing = 0;
  const problems = [];

  for (const [i, row] of sample.entries()) {
    let live;
    try { live = await fetchLive(row.id); }
    catch (e) { console.error(`  [${i + 1}] ${row.id}  LỖI GỌI API: ${e.message}`); fail++; await sleep(400); continue; }

    if (!live) { missing++; console.error(`  [${i + 1}] ${row.id}  ⚠ không còn trên site (đã gỡ?)`); await sleep(400); continue; }

    const diffs = [];
    for (const [remote, local] of FIELDS) {
      const a = (live[remote] ?? ''), b = (row[local] ?? '');
      const same = String(a).trim() === String(b).trim() ||
                   (typeof a === 'number' && Number(a) === Number(b));
      if (!same) diffs.push(`${remote}: site="${a}" | file="${b}"`);
    }
    // mô tả: so 60 ký tự đầu (file cắt còn 120 ký tự)
    const m1 = String(live.moTa || '').slice(0, 60).trim();
    const m2 = String(row.moTa || '').slice(0, 60).trim();
    if (m1 !== m2) diffs.push(`moTa: site="${m1}" | file="${m2}"`);

    if (diffs.length) {
      fail++;
      problems.push({ id: row.id, diffs });
      console.error(`  [${i + 1}] ${row.id}  ✗ KHỚP ${diffs.length} trường`);
      diffs.forEach(d => console.error(`        - ${d}`));
    } else {
      ok++;
      console.error(`  [${i + 1}] ${row.id}  ✓ khớp toàn bộ  (${row.giaHienThi} · ${row.quan})`);
    }
    await sleep(400);
  }

  console.error('');
  console.error(`KẾT QUẢ: khớp ${ok}/${sample.length} · sai ${fail} · không còn trên site ${missing}`);
  if (problems.length) {
    fs.writeFileSync('verify-problems.json', JSON.stringify(problems, null, 2), 'utf8');
    console.error('→ chi tiết sai lệch: verify-problems.json');
  } else {
    console.error('→ Dữ liệu đã cào KHỚP 100% với dữ liệu live của website.');
  }
})();