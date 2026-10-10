/**
 * =============================================================================
 *  Xuất dữ liệu thành JSON tĩnh cho GitHub Pages.
 *
 *  Vì sao cần bước này: GitHub Pages chỉ phục vụ file tĩnh. Trang public sẽ
 *  gọi localhost:8787 thì người xem thấy trang rỗng — nên dữ liệu phải nằm
 *  ngay trong repo và được frontend đọc trực tiếp.
 *
 *  Sau này khi có Supabase/Worker, chỉ cần đổi biến NEXT_PUBLIC_API_URL là
 *  frontend chuyển sang gọi API thật. KHÔNG phải sửa component nào.
 *
 *  Dùng:  node tools/export_static.mjs
 *  Xuất:  web/public/data/*.json
 * ============================================================================= */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildDataset } from '../workers/mock/dataset.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../web/public/data');

const { districts, projects, listings, mapProjects } = buildDataset();

mkdirSync(OUT, { recursive: true });

/** Cắt bớt field thừa để JSON nhẹ — mỗi byte là tải cho người dùng */
const slimListing = (l) => ({
  id: l.id,
  slug: l.slug,
  ref: l.reference_code,
  type: l.type,
  title: l.title,
  price: l.price,
  negotiable: l.negotiable,
  area: l.area,
  bedrooms: l.bedrooms,
  bathrooms: l.bathrooms,
  floors: l.floors,
  floor_number: l.floor_number,
  direction: l.direction,
  furniture: l.furniture,
  features: l.features,
  project_id: l.project_id,
  project_name: l.project_name,
  project_slug: l.project_slug,
  project_hue: l.project_hue,
  project_lat: l.project_lat,
  project_lng: l.project_lng,
  project_approx: l.project_lat_approximate,
  tower_name: l.tower_name,
  district_id: l.district_id,
  district_name: l.district_name,
  is_sponsored: l.is_sponsored,
  view_count: l.view_count,
  view_count_7d: l.view_count_7d,
  published_at: l.published_at,
});

const slimProject = (p) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  address: p.address,
  district_id: p.district_id,
  district_name: p.district_name,
  apartment_count: p.apartment_count,
  building_count: p.building_count,
  amenities: p.amenities,
  hue: p.hue,
  lat: p.lat,
  lng: p.lng,
  lat_approximate: p.lat_approximate,
  is_published: p.is_published,
  is_verified: p.is_verified,
});

function write(name, obj) {
  const path = join(OUT, name);
  writeFileSync(path, JSON.stringify(obj), 'utf8');
  return { name, kb: (Buffer.byteLength(JSON.stringify(obj)) / 1024) };
}

const files = [
  write('districts.json', districts),
  write('projects.json', projects.map(slimProject)),
  write('listings.json', listings.map(slimListing)),
  write('map.json', mapProjects),
  write('meta.json', {
    generated_at: new Date().toISOString(),
    source: 'Danh sách chung cư HCM - AMI.pdf',
    counts: {
      districts: districts.length,
      projects: projects.length,
      listings: listings.length,
      mapped: mapProjects.length,
    },
    warning:
      'Dữ liệu mẫu để xem giao diện. Giá là số NGẪU NHIÊN trong khoảng có thật trong ' +
      'PDF, toạ độ là TÂM QUẬN chứ không phải vị trí thật của dự án.',
  }),
];

console.log('Xuất ra web/public/data:');
for (const f of files) console.log(`  ${f.name.padEnd(16)} ${f.kb.toFixed(0).padStart(5)} KB`);
console.log(`  ${'TỔNG'.padEnd(16)} ${files.reduce((s, f) => s + f.kb, 0).toFixed(0).padStart(5)} KB`);
console.log(`\n  ${listings.length} tin · ${projects.length} dự án · ${mapProjects.length} có toạ độ`);