/** Thử các dịch vụ geocode miễn phí xem cái nào nhận ra chung cư VN. */
const UA = 'SGREALTY-demo/1.0 (thu nghiem dinh vi du an)';

const cases = [
  'Vinhomes Central Park',
  '108 Hồng Hà, Phú Nhuận, Hồ Chí Minh',
  'Masteri Thao Dien, TP. Hồ Chí Minh',
  'The Manor, Bình Triệu, Thủ Đức',
];

async function nominatim(q) {
  const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=3&countrycodes=vn&addressdetails=1`;
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'vi' } });
  if (!r.ok) return { loi: `HTTP ${r.status}` };
  const j = await r.json();
  return {
    so: j.length,
    ket: j.slice(0, 2).map((x) => `${x.lat.slice(0, 7)},${x.lon.slice(0, 7)} — ${(x.display_name || '').slice(0, 70)}`),
  };
}

async function photon(q) {
  const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3&lang=vi`;
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) return { loi: `HTTP ${r.status}` };
  const j = await r.json();
  return {
    so: (j.features || []).length,
    ket: (j.features || []).slice(0, 2).map((f) =>
      `${f.geometry.coordinates[1].toFixed(4)},${f.geometry.coordinates[0].toFixed(4)} — ${(f.properties?.name || '').slice(0, 45)} [${(f.properties?.city || '')}, ${(f.properties?.district || '')}]`),
  };
}

async function overpass(q, lat, lon) {
  // tìm toà nhà theo tên trong bán kính 3km
  const body = `[out:json][timeout:20];
(node["name"~"${q}", "building"](around:3000,${lat},${lon});
 way["name"~"${q}", "building"](around:3000,${lat},${lon});
);
out center 3;`;
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: 'data=' + encodeURIComponent(body),
  });
  if (!r.ok) return { loi: `HTTP ${r.status}` };
  const j = await r.json();
  return { so: (j.elements || []).length };
}

console.log('=== Nominatim ===');
for (const q of cases) console.log(`  "${q}"\n    ${JSON.stringify(await nominatim(q))}`);
console.log('\n=== Photon ===');
for (const q of cases) console.log(`  "${q}"\n    ${JSON.stringify(await photon(q))}`);
console.log('\n=== Overpass (toà nhà theo tên) ===');
for (const q of ['Vinhomes', 'Masteri', 'Manor']) console.log(`  "${q}" -> ${JSON.stringify(await overpass(q, 10.78, 106.69))}`);