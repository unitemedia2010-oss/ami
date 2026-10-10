/**
 * =============================================================================
 *  Sinh dữ liệu từ PDF "Danh sách chung cư HCM - AMI.pdf"
 *
 *  Tách riêng khỏi server để dùng lại cho hai mục đích:
 *    • workers/mock/server.mjs  → chạy API giả khi phát triển
 *    • tools/export_static.mjs  → xuất JSON tĩnh đẩy lên GitHub Pages
 *
 *  ⚠ TOẠ ĐỘ: đặt theo TÂM QUẬN + độ lệch ngẫu nhiên nhỏ để các marker
 *    không chồng đúng một điểm. Đây KHÔNG phải vị trí thật của dự án.
 *    Mọi bản ghi mang cờ `lat_approximate: true`; giao diện hiển thị nhãn
 *    "Vị trí ước lượng theo quận" cho tới khi có toạ độ chính xác.
 *    Toạ độ thật lấy từ Google Maps, nhập trong trang quản trị.
 * ============================================================================= */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '../../tools/projects.json');

/* ------------------------------------------------------------------ tiện ích */
export const slugify = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 60);

export const fold = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

/** Hue cố định theo tên → cùng dự án luôn cùng màu ảnh */
function hueOf(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return 6 + (h % 34);            // 6..39 → vùng cam-đỏ của thương hiệu
}

/** Màu ảnh đại diện, dạng SỐ hue — client tự vẽ SVG để không phải nhúng ảnh */
const DIRECTIONS = ['Đông', 'Tây', 'Nam', 'Bắc', 'Đông Nam', 'Tây Nam', 'Đông Bắc', 'Tây Bắc'];
const FURNITURE = ['Cơ bản', 'Đầy đủ', 'Nội thất cao cấp'];
const DAY = 86400000;

const DISTRICT_GEO = {
  'Quận 1':    [10.7769, 106.7009],
  'Quận 3':    [10.7756, 106.6819],
  'Quận 4':    [10.7679, 106.6869],
  'Quận 5':    [10.7621, 106.6793],
  'Quận 6':    [10.7580, 106.6650],
  'Quận 8':    [10.7370, 106.6780],
  'Gò Vấp':    [10.8180, 106.6880],
  'Phú Nhuận': [10.7840, 106.7000],
  'Tân Bình':  [10.8010, 106.6520],
};

const DISTRICTS = [
  { name: 'Quận 1',    slug: 'quan-1',    aliases: ['quan 1', 'q1', 'td1'] },
  { name: 'Quận 3',    slug: 'quan-3',    aliases: ['quan 3', 'q3', 'td3'] },
  { name: 'Quận 4',    slug: 'quan-4',    aliases: ['quan 4', 'q4', 'td4'] },
  { name: 'Quận 5',    slug: 'quan-5',    aliases: ['quan 5', 'q5', 'td5'] },
  { name: 'Quận 6',    slug: 'quan-6',    aliases: ['quan 6', 'q6', 'td6'] },
  { name: 'Quận 8',    slug: 'quan-8',    aliases: ['quan 8', 'q8', 'td8'] },
  { name: 'Gò Vấp',    slug: 'go-vap',    aliases: ['go vap', 'gv'] },
  { name: 'Phú Nhuận', slug: 'phu-nhuan', aliases: ['phu nhuan', 'pn'] },
  { name: 'Tân Bình',  slug: 'tan-binh',  aliases: ['tan binh', 'tb'] },
];

/**
 * Dựng toàn bộ dataset.
 * Dùng seed cố định nên mỗi lần chạy cho ra cùng kết quả — quan trọng khi
 * xuất JSON tĩnh, nếu không mỗi lần deploy lại sẽ đổi dữ liệu.
 */
export function buildDataset() {
  const raw = JSON.parse(readFileSync(SRC, 'utf8'));

  let seed = 20251008;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const between = (a, b) => a + rnd() * (b - a);
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const districts = DISTRICTS.map((d, i) => ({
    id: i + 1,
    code: d.slug.toUpperCase().replace(/-/g, '_'),
    slug: d.slug,
    name_new: d.name,
    name_old: null,
    aliases: d.aliases,
    type: /^Quận \d+$/.test(d.name) ? 'quận' : 'huyện',
    is_active: true,
    verified: true,
    sort_order: i + 1,
  }));
  // ⚠ Khoá phải là `name_new`, KHÔNG phải `name`. Sau khi map, object đã đổi
  //   tên trường: name không còn tồn tại → map ra undefined cho mọi quận →
  //   mọi tin có district_id = null → lọc theo quận luôn ra 0 kết quả.
  const distByName = new Map(districts.map((d) => [d.name_new, d]));

  const projects = [];
  const listings = [];
  const bySlug = new Set();
  let hid = 0;

  for (const p of raw) {
    if (!p.name || p.name.length < 2) continue;
    const d = distByName.get(p.district);
    const slug = slugify(p.name) || `du-an-${p.seq}`;
    if (bySlug.has(slug)) continue;
    bySlug.add(slug);

    const hue = hueOf(p.name);
    const geo = DISTRICT_GEO[p.district];
    const lat = geo ? +(geo[0] + between(-0.012, 0.012)).toFixed(6) : null;
    const lng = geo ? +(geo[1] + between(-0.012, 0.012)).toFixed(6) : null;

    const project = {
      id: `prj-${++hid}`,
      slug,
      name: p.name,
      address: p.address || '',
      district_id: d?.id ?? null,
      district_name: p.district || null,
      apartment_count: p.count ?? null,
      building_count: p.count ? Math.max(1, Math.round(p.count / 120)) : null,
      amenities: p.amenities,
      hue,                                   // client tự vẽ ảnh từ hue + tên
      lat,
      lng,
      lat_approximate: lat != null,
      is_published: true,
      is_verified: !p.district_estimated,
    };
    projects.push(project);

    // mỗi loại phòng → 2–3 tin, biến thể tầng/hướng để danh sách có số lượng
    const variants = 2 + Math.floor(rnd() * 2);
    for (const room of p.rooms) {
      const beds = /PN/i.test(room.type)
        ? Math.max(...(room.type.match(/\d+/g)?.map(Number) ?? [1]))
        : 1;

      for (let v = 0; v < variants; v++) {
        const area = room.area_min != null
          ? +between(room.area_min, room.area_max ?? room.area_min).toFixed(1)
          : null;

        const makeRent = room.rent_min != null
          && (room.price_min == null || rnd() < 0.3);

        // ⚠ price LUÔN tính bằng TRIỆU (xem lib/api.ts). Giá bán trong PDF
        //   tính bằng TỶ nên nhân 1000 khi đưa về đơn vị chuẩn.
        let price;
        if (makeRent) {
          price = Math.round(between(room.rent_min, room.rent_max ?? room.rent_min));
        } else if (room.price_min != null) {
          price = Math.round(between(room.price_min, room.price_max) * 1000);
        } else continue;

        const floor = 5 + Math.floor(rnd() * 30);
        const lslug = `${slug}-${room.type.replace(/[^0-9a-z]+/gi, '').toLowerCase()}`
          + `-${area ?? 'x'}-${v + 1}`;

        listings.push({
          id: `lst-${slugify(lslug)}`,
          slug: lslug,
          reference_code: `PR-${String(listings.length + 1).padStart(5, '0')}`,
          type: makeRent ? 'rent' : 'sell',
          title: `${p.name} · ${room.type}${area ? ` ${area}m²` : ''}`
            + `${v ? ` — tầng ${floor}` : ''}`,
          price,
          price_unit: 'triệu',
          negotiable: rnd() < 0.45,
          area,
          bedrooms: beds,
          bathrooms: Math.max(1, Math.round(beds * 0.75)),
          floors: 20 + Math.floor(rnd() * 30),
          floor_number: floor,
          direction: pick(DIRECTIONS),
          furniture: pick(FURNITURE),
          features: p.amenities,
          project_id: project.id,
          project_name: p.name,
          project_slug: slug,
          project_hue: hue,
          project_lat: lat,
          project_lng: lng,
          project_lat_approximate: project.lat_approximate,
          tower_name: `Toà ${String.fromCharCode(65 + Math.floor(rnd() * 8))}${1 + Math.floor(rnd() * 9)}`,
          ward_id: null,
          ward_name: null,
          district_id: d?.id ?? null,
          district_name: p.district || null,
          street_id: null,
          agent_id: null,
          is_sponsored: rnd() < 0.14,
          priority: 0,
          view_count: Math.floor(rnd() * 900),
          view_count_7d: Math.floor(rnd() * 120),
          published_at: new Date(Date.now() - rnd() * 40 * DAY).toISOString(),
          created_at: new Date(Date.now() - rnd() * 60 * DAY).toISOString(),
        });
      }
    }
  }

  listings.sort((a, b) => b.published_at.localeCompare(a.published_at));

  // đếm tin mỗi dự án cho popup bản đồ
  const count = new Map();
  for (const l of listings) count.set(l.project_id, (count.get(l.project_id) || 0) + 1);

  const mapProjects = projects
    .filter((x) => x.lat != null)
    .map((x) => ({
      id: x.id, name: x.name, lat: x.lat, lng: x.lng,
      address: x.address, district_name: x.district_name,
      approximate: x.lat_approximate, listings: count.get(x.id) || 0,
    }));

  return { districts, projects, listings, mapProjects };
}

/** Tìm quận theo tên mới HOẶC tên cũ/viết tắt */
export function findDistricts(districts, q) {
  const f = fold(q);
  if (!f) return [];
  return districts.filter(
    (d) => fold(d.name_new).includes(f) || d.aliases.some((a) => fold(a).includes(f)));
}