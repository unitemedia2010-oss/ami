/**
 * =============================================================================
 *  ĐỊNH VỊ TOẠ ĐỘ THẬT CHO DỰ ÁN
 *
 *  Vì sao cần: bản dùng thử đang đặt mọi dự án ở TÂM QUẬN. Người xem thấy
 *  cụm marker dồn một chỗ — không phải vị trí thật của căn hộ.
 *
 *  Cách làm: Nominatim (OpenStreetMap) — miễn phí, không cần API key.
 *  Ba tín hiệu, thử theo thứ tự và lấy kết quả đầu tiên đủ tin cậy:
 *      1. tên dự án  + tên quận
 *      2. địa chỉ      + tên quận
 *      3. tên dự án, không giới hạn vùng
 *
 *  Mỗi kết quả được KIỂM CHÉO bằng cách so khoảng cách tới tâm quận mà PDF
 *  khai báo. Lệch quá xa → bác bỏ, không ghi. Rẻ hơn nhiều so với hiển thị
 *  sai chỗ, và người dùng còn biết mình đang xem dữ liệu mẫu.
 *
 *  ⚠ Chính sách dùng Nominatim: tối đa 1 yêu cầu/giây và BẮT BUỘC cache kết
 *    quả. File cache nằm ở tools/.geocode-cache.json — đừng xoá.
 *
 *  Dùng:
 *    node tools/geocode.mjs              # chạy cho toàn bộ dự án
 *    node tools/geocode.mjs --limit 15   # thử nhanh vài cái
 *    node tools/geocode.mjs --retry      # thử lại những cái đang thất bại
 * ========================================================================== */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'projects.json');
const CACHE = join(HERE, '.geocode-cache.json');
const OUT = join(HERE, 'projects-coords.json');

const UA = 'SGREALTY-demo/1.0 (xu ban thu nghiem dinh vi du an chung cu TP.HCM)';

/* -----------------------------------------------------------------------------
 *  Tâm các quận để kiểm chéo kết quả. Lấy theo trung tâm hành chính, đủ
 *  thô để phát hiện "ra quá xa"; không dùng để hiển thị.
 * ---------------------------------------------------------------------------*/
const DISTRICT_CENTER = {
  'Quận 1': [10.7769, 106.7009], 'Quận 3': [10.7756, 106.6819],
  'Quận 4': [10.7679, 106.6869], 'Quận 5': [10.7621, 106.6793],
  'Quận 6': [10.7580, 106.6650], 'Quận 8': [10.7370, 106.6780],
  'Gò Vấp': [10.8180, 106.6880], 'Phú Nhuận': [10.7840, 106.7000],
  'Tân Bình': [10.8010, 106.6520],
  'Quận 2': [10.8231, 106.6297], 'Quận 7': [10.7400, 106.7130],
  'Quận 9': [10.8399, 106.7110], 'Quận 10': [10.8231, 106.7150],
  'Quận 11': [10.7639, 106.6532], 'Quận 12': [10.7280, 106.6300],
  'Thủ Đức': [10.8600, 106.7200], 'Bình Thạnh': [10.7900, 106.6850],
  'Bình Tân': [10.7600, 106.5900], 'Tân Phú': [10.7620, 106.6280],
  'Bình Chánh': [10.7800, 106.4700], 'Củ Chi': [10.9800, 106.6700],
  'Hóc Môn': [10.9300, 106.5800], 'Nhà Bè': [10.6900, 106.7400],
  'Cần Giờ': [10.5400, 106.9500],
};

/** Sai số tối đa chấp nhận, tính bằng km */
const MAX_DIST_KM = { 'ten+quan': 6, 'dia-chi': 4, 'ten': 3.5 };

/**
 * Điểm tối thiểu để tin kết quả.
 *
 * Quan sát từ lần chạy thử: các ca KHỚP ĐÚT đều ≥ 98 điểm
 * (tên trùng gần như tuyệt đối trong OSM). Các ca SAI nằm ở 20–41 —
 * chúng chỉ khớp vài từ rời rạc, thường là một đường phố hoặc công trình
 * hành chính đứng cùng địa chỉ. Dưới ngưỡng này thà báo "không tìm thấy".
 */
const MIN_SCORE = 55;

/** Loại kết quả OSM không phải toà nhất / khu chung cư */
const REJECT_TYPE = /^(road|street|highway|footway|path|cycleway|track|boundary|place|waterway|river|address)$/;

/**
 * Bình bao TP.HCM — chốt chặn tuyệt đối.
 *
 * ⚠ Đã xảy ra thật: 5 dự án bị Nominatim đưa sang tỉnh khác —
 *   "GreenField 686" → trường Greenfield ở Hưng Yên, "Đất Phương Nam" →
 *   trường đại học ở Hải Phòng, "Galaxy 9" → cửa hàng ở Quảng Ngãi,
 *   "D-Vela" và "M-One Nam Sài Gòn" → khu đô thị ở Hà Nội.
 *   Nguyên nhân chung: các dự án này KHÔNG có quận trong PDF, nên bộ kiểm
 *   tra khoảng cách tới tâm quận không chạy, và bộ lọc điểm không đủ chặt.
 *   Bỏ lọc này thì bản đồ hiện marker ở tận Quảng Ngãi — rất nặng.
 *
 * Bao rộng có chủ ý: TP.HCM trải từ cầu Phú Mỹ (Bình Chánh) tới xã Bình
 * Hưng Hòa (Củ Chi), nên vùng lấy hơi rộng cho chắc.
 */
const HCMC_BOX = { latMin: 10.30, latMax: 11.25, lngMin: 106.30, lngMax: 107.10 };

const trongHCMC = (lat, lng) =>
  lat >= HCMC_BOX.latMin && lat <= HCMC_BOX.latMax
  && lng >= HCMC_BOX.lngMin && lng <= HCMC_BOX.lngMax;

/**
 * Ngưỡng điểm cho dự án KHÔNG có quận trong PDF.
 *
 * Các dự án có quận được kiểm tra chéo bằng khoảng cách tới tâm quận — đó là
 * một lưới an toàn độc lập với tên. Dự án không có quận thì mất lưới đó,
 * nên phải đòi tên khớp chặt hơn: chỉ nhận điểm ≥ 90 (các ca chắc chắn
 * đúng đều ở 165–186).
 */
const MIN_SCORE_KHI_KHONG_CO_QUAN = 90;

/* ------------------------------------------------------------------ tiện ích */
const fold = (s) => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().trim();

/** Khoảng cách haversine, tính bằng km */
function distKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Địa chỉ có số nhà không — ví dụ "108 Hồng Hà" có, "Phan Huy Ích" thì không */
const hasHouseNumber = (a) => /^\s*\d+[A-Z]?\s+\S/.test(a || '');

/** Chuỗi không phải tên dự án mà là địa chỉ do parser cắt nhầm */
function looksLikeAddress(name) {
  return /^\s*\d+[A-Z]?\s+/.test(name) || /^[\d.,]+\s*(triệu|tỷ)/i.test(name);
}

/**
 * Rút gọn tên dự án về phần chính.
 *
 * ⚠ Chỉ cắt khi dấu phân cách CÓ KHOẢNG TRẮNG hai bên.
 *   Bản đầu tiên dùng `/\s*[-–—]\s*.*$/` — `\s*` khớp cả 0 khoảng trắng, nên
 *   "D-Vela" bị cắt thành "D". Rồi "D" khớp với bất kỳ địa danh nào có chữ
 *   "d" trong display_name của OSM. Hậu quả thật:
 *     D-Vela          → khớp "D" ở Lê Văn Lương, Nhà Bè
 *     D-AQUA          → khớp "D" ở Chánh Hưng
 *     M-One Nam Sài Gòn → khớp "M" ở Nguyễn Hữu Hào
 *     M-One Gia Định  → khớp quán "Mộc coffee"
 *   Những tên gạch liền nhau (M-One, D-Vela) là tên thương mại hợp lệ, phải
 *   giữ nguyên.
 */
const cleanName = (n) => (n || '')
  .replace(/\s+[/\-–—]\s+.*$/, '')       // "Phúc Yên 3 / Hope Garden" → "Phúc Yên 3"
  .replace(/\s*\([^)]*\)/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

/* ------------------------------------------------------------------- cache */
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const saveCache = () => writeFileSync(CACHE, JSON.stringify(cache, null, 0), 'utf8');

/* ------------------------------------------------------------------ gọi API */
async function nominatim(query) {
  if (cache[query] !== undefined) return cache[query];

  const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}`
    + `&format=jsonv2&limit=5&countrycodes=vn&addressdetails=1&limit=5`;
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'vi,en' } });

  if (!r.ok) {                       // 429 = quá nhanh → đợi rồi thử lại
    if (r.status === 429) { await sleep(4000); return nominatim(query); }
    cache[query] = { loi: `HTTP ${r.status}` };
    return cache[query];
  }

  const j = await r.json();
  const kq = j.map((x) => ({
    lat: +x.lat, lng: +x.lon,
    ten: x.display_name,
    loai: x.category || x.type || '',
    quan: x.address?.city_district || x.address?.suburb || x.address?.city || '',
  }));
  cache[query] = kq;
  saveCache();
  return kq;
}

/* Chờ không tốn CPU.
   ⚠ Bản đầu tiên viết bằng vòng lặp busy-wait:
        while (Date.now() - t < ms) { }
     Nó chiếm trọn một lõi CPU suốt 10 phút chạy. Kết quả: máy còn 1,1 GB
     RAM và `tsc` bị báo "Fatal process out of memory" giữa lúc đang chờ.
     Dùng await setTimeout là đủ — Node cho event loop nghỉ ngơi. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --------------------------------------------------------- chấm điểm kết quả */
/**
 * Chọn kết quả đúng nhất trong danh sách Nominatim trả về.
 *
 * @param want        chuỗi đã dùng để gọi API (địa chỉ hoặc tên rút gọn)
 * @param projectName tên đủ của dự án — tín hiệu mạnh nhất để so khớp
 *
 * Cách chấm điểm dựa trên quan sát thực tế:
 *   • OSM thường KHÔNG giữ đúng tên thương mại ("The Botanica" được lưu
 *     thành "Chung cư Botanica Phổ Quang"). Nên chỉ so cụm `want` sẽ bác
 *     oan. Bù lại, mọi từ đặc trưng dài ≥5 ký tự trong tên dự án đều xuất
 *     hiện trong kết quả → cộng điểm mạnh.
 *   • Ngược lại, ca sai chỉ trùng 1–2 từ chung và không trùng từ đặc trưng
 *     nào, nên vẫn nằm dưới ngưỡng.
 */
function pick(results, want, projectName, district, maxKm) {
  if (!results || !results.length) return null;
  const w = fold(want);
  const center = DISTRICT_CENTER[district];
  const toksWant = w.split(/[\s,./-]+/).filter((t) => t.length >= 3);
  const toksTen = fold(projectName || want).split(/[\s,./-]+/).filter((t) => t.length >= 3);
  // từ đặc trưng: dài, hiếm gặp — dùng làm tín hiệu mạnh nhất
  const dacTrung = fold(projectName || want).split(/[\s,./-]+/).filter((t) => t.length >= 5);

  /* Địa chỉ có số nhà thì kết quả BẮT BUỘC phải chứa số đó.
     Nếu không, Nominatim sẽ khớp một công trình bất kỳ nằm trên cùng con
     đường — ví dụ "6 Tân Sơn" ra Cục Điều tra Hình sự ở 6 Thăng Long. */
  const soNha = (String(want).match(/^\s*(\d+[a-z]?)\s/) || [])[1];

  let best = null;
  for (const r of results) {
    // bỏ qua đường phố, sông, ranh giới — không phải chung cư
    if (REJECT_TYPE.test(r.loai)) continue;

    // chốt chặn tuyệt đối: ngoài TP.HCM thì bỏ, không cần xem điểm
    if (!trongHCMC(r.lat, r.lng)) continue;

    const d = fold(r.ten);
    if (soNha && !new RegExp(`\\b${soNha}\\b`).test(d)) continue;

    /* Chốt chặn tên: phải chứa tên dự án, hoặc chứa TRUNG YẾU mọi từ đặc
       trưng của tên dự án. Không có điều này thì "M-One Gia Định" khớp
       một quán cà phê ("Mộc coffee") vì chung mấy từ phổ biến. */
    const tenDung = projectName ? d.includes(fold(projectName)) : true;
    const coDacTrung = dacTrung.length > 0 && dacTrung.every((t) => d.includes(t));
    if (!tenDung && !coDacTrung) continue;

    let score = 0;
    // 1. tên dự án trùng khớp
    if (projectName && d.includes(fold(projectName))) score += 55;
    // 2. mọi từ đặc trưng của tên dự án đều có trong kết quả
    if (dacTrung.length && dacTrung.every((t) => d.includes(t))) score += 40;
    // 3. trùng cụm từ khoá đã gọi
    if (d.includes(w)) score += 35;
    // 4. độ chồng lấn từ
    if (toksWant.length) {
      score += (toksWant.filter((t) => d.includes(t)).length / toksWant.length) * 20;
    }
    if (toksTen.length) {
      score += (toksTen.filter((t) => d.includes(t)).length / toksTen.length) * 15;
    }
    // 5. đúng quận
    if (r.quan && district && fold(r.quan).includes(fold(district))) score += 10;

    // 6. không quá xa quận khai báo
    let km = null;
    if (center) {
      km = distKm([r.lat, r.lng], center);
      if (km > maxKm) continue;
      score += Math.max(0, 12 - km);       // càng gần trung tâm càng tốt
    }
    if (!best || score > best.score) best = { ...r, score, km };
  }

  if (!best) return null;

  // dự án không có quận trong PDF thì không có lưới an toàn khoảng cách
  if (!district && best.score < MIN_SCORE_KHI_KHONG_CO_QUAN) return null;
  if (best.score < MIN_SCORE) return null;
  return best;
}

/* =============================================================================
 *  Chạy
 * ========================================================================== */
const argv = process.argv.slice(2);
const LIMIT = argv.includes('--limit') ? +argv[argv.indexOf('--limit') + 1] : Infinity;
const ONLY_RETRY = argv.includes('--retry');
/**
 * --refilter : xoá kết quả cũ rồi chấm điểm lại TỪ CACHE, không gọi mạng.
 * Cần khi sửa bộ lọc — ví dụ thêm chốt chặn bình bao TP.HCM thì 5 dự án
 * bị định vị ra Hà Nội/Hưng Yên phải bị loại ngay, mà không cần tốn 10
 * phút gọi lại Nominatim từ đầu.
 */
const REFILTER = argv.includes('--refilter');

const all = JSON.parse(readFileSync(SRC, 'utf8'));

/* Nạp kết quả đã có để chạy tiếp thay vì làm lại từ đầu.
   Lần chạy trước bị máy khởi động lại giữa chừng; nhờ cache truy vấn nên
   phần đã làm không mất công. */
const kq = !REFILTER && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const xuLy = (name, ghi) => { kq[name] = ghi; writeFileSync(OUT, JSON.stringify(kq, null, 1), 'utf8'); };
const tong = () => Object.keys(kq).length;
const soOk = () => Object.values(kq).filter((x) => x.ok).length;

console.log(REFILTER
  ? `CHẤM LẠI — chỉ đọc cache (${Object.keys(cache).length} truy vấn), không gọi mạng`
  : `bắt đầu — đã có ${tong()} kết quả, ${Object.keys(cache).length} truy vấn trong cache`);

for (const p of all) {
  const name = (p.name || '').trim();
  if (!name) continue;
  if (kq[name]) continue;
  if (LIMIT !== Infinity && tong() >= LIMIT) break;
  if (ONLY_RETRY && kq[name]?.ok) continue;

  const nm = cleanName(name);
  const dist = p.district || '';
  const addr = (p.address || '').trim();
  const canDiaChi = !looksLikeAddress(name) && addr && hasHouseNumber(addr);

  let best = null;

  /* --- 1. tên dự án + quận --- */
  if (!looksLikeAddress(name)) {
    for (const q of [`${nm}, ${dist}`.replace(/,\s*$/, ''), `${nm}, Hồ Chí Minh`]) {
      const r = await nominatim(`${q}, Việt Nam`);
      const hit = pick(r, nm, nm, dist, MAX_DIST_KM['ten+quan'] ?? 6);
      if (hit) { best = { ...hit, nguon: 'ten+quan' }; break; }
      await sleep(1100);              // tôn trọng giới hạn 1 yêu cầu/giây
    }
  }

  /* --- 2. địa chỉ có số nhà + quận ---
     ⚠ CHỈ dùng khi địa chỉ có số nhà. Địa chỉ kiểu "Phan Huy Ích" chỉ là
        tên đường — Nominatim sẽ trả về một công trình bất kỳ nằm trên
        đường đó (lần chạy thử: Phúc Yên khớp nhầm Trường Tiểu học
        Phan Huy Ích). Bỏ nguồn này thà chỉ tìm bằng tên dự án. */
  if (!best && canDiaChi) {
    const r = await nominatim(`${addr}, ${dist}, Hồ Chí Minh, Việt Nam`);
    best = pick(r, addr.split(',')[0], nm, dist, MAX_DIST_KM['dia-chi'] ?? 4);
    if (best) best = { ...best, nguon: 'dia-chi' };
    await sleep(1100);
  }

  /* --- 3. tên dự án, không giới hạn vùng --- */
  if (!best && !looksLikeAddress(name)) {
    const r = await nominatim(`${nm}, Hồ Chí Minh, Việt Nam`);
    best = pick(r, nm, nm, '', MAX_DIST_KM['ten'] ?? 3.5);
    if (best) best = { ...best, nguon: 'ten' };
    await sleep(1100);
  }

  xuLy(name, best
    ? { ok: true, lat: +best.lat.toFixed(6), lng: +best.lng.toFixed(6),
        nguon: best.nguon, diem: +best.score.toFixed(1),
        cachQuanKm: best.km == null ? null : +best.km.toFixed(2),
        osmt: best.ten }
    : { ok: false });

  // Ghi từng kết quả ngay thay vì đợi tới cuối: lần trước máy khởi động lại
  // giữa chừng và mất trắng toàn bộ kết quả chưa ghi.
  if (tong() % 5 === 0) console.log(`  ${tong()}/${all.length} — định vị được ${soOk()}`);
}

const bySource = {};
for (const v of Object.values(kq)) if (v.ok) bySource[v.nguon] = (bySource[v.nguon] || 0) + 1;

console.log(`\nxong ${tong()}/${all.length} dự án — định vị được ${soOk()}`);
console.log('theo nguồn:', JSON.stringify(bySource));
console.log('ghi ra tools/projects-coords.json');

console.log(`ghi ra tools/projects-coords.json`);