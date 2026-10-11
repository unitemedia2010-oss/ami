/**
 * Thử Overpass chậm, giãn cách, trên vài dự án — để đo tỉ lệ dự án có
 * ảnh trong OpenStreetMap.
 */
const UA = 'SGREALTY-demo/1.0 (thu nghiem tim anh du an)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TEN = ['Vinhomes Grand Park', 'Masteri Thao Dien', 'Vinhomes Central Park', 'The Manor'];

async function hoi(ten) {
  const q = `[out:json][timeout:60];
(
  nwr["name"~"${ten}",i]["building"](10.50,106.30,11.20,107.10);
  nwr["name"~"${ten}",i]["landuse"="residential"](10.50,106.30,11.20,107.10);
);
out tags 5;`;
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: 'data=' + encodeURIComponent(q),
  });
  if (!r.ok) return { loi: `HTTP ${r.status}` };
  const j = await r.json();
  const els = j.elements || [];
  const anh = els
    .map((e) => e.tags?.image || e.tags?.wikimedia_commons || e.tags?.['contact:photo'])
    .filter(Boolean);
  return { toaNha: els.length, coAnh: anh.length, viDu: anh.slice(0, 2).map((a) => a.slice(0, 70)) };
}

for (const t of TEN) {
  try {
    console.log(`  ${t.padEnd(24)} ${JSON.stringify(await hoi(t))}`);
  } catch (e) {
    console.log(`  ${t.padEnd(24)} lỗi mạng — ${String(e.message).slice(0, 40)}`);
  }
  await sleep(4000);   // Overpass giới hạn ~1 yêu cầu/giây, lấy chỗ khác cho chắc
}