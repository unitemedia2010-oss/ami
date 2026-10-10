/**
 * =============================================================================
 *  API tĩnh — đọc dữ liệu từ file JSON trong /public/data
 *
 *  Dùng khi biến NEXT_PUBLIC_API_URL rỗng (mặc định khi deploy GitHub Pages).
 *  Khi nào có Supabase/Worker, chỉ cần đặt NEXT_PUBLIC_API_URL — module này
 *  không được gọi tới nữa. KHÔNG phải sửa component nào.
 *
 *  File JSON đã rút gọn tên field cho nhẹ (ref, project_hue, project_approx…).
 *  Hàm hydrate() đổi lại về đúng tên mà component dùng, để phía component
 *  không cần biết mình đang chạy ở chế độ nào.
 * ============================================================================= */

import type { ListingCard, ListingPage } from './api';

/* Dữ liệu nằm trong thư mục /public/data. Khi deploy lên project site của
   GitHub (…github.io/ami/) thì đường dẫn phải có tiền tố /ami — cùng biến
   mà next.config.mjs dùng cho basePath. Đặt rỗng khi chạy local. */
const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/data`;

let cache: Promise<Dataset> | null = null;

interface RawListing {
  id: string; slug: string; ref: string; type: 'sell' | 'rent';
  title: string; price: number; negotiable: boolean;
  area: number | null; bedrooms: number | null; bathrooms: number | null;
  floors: number | null; floor_number: number | null;
  direction: string | null; furniture: string | null; features: string[];
  project_id: string; project_name: string; project_slug: string;
  project_hue: number; project_lat: number | null; project_lng: number | null;
  project_approx: boolean; tower_name: string;
  district_id: number | null; district_name: string | null;
  is_sponsored: boolean; view_count: number; view_count_7d: number;
  published_at: string;
}

interface Dataset {
  districts: any[];
  projects: any[];
  listings: ListingCard[];
  mapProjects: any[];
}

/** Bỏ dấu để so khớp không phân biệt dấu, giống hàm cùng loại ở Worker */
const fold = (s?: string | null) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

/** Đổi tên field ngắn về tên đầy đủ mà component dùng */
function hydrate(r: RawListing): ListingCard {
  return {
    id: r.id,
    slug: r.slug,
    reference_code: r.ref,
    type: r.type,
    title: r.title,
    price: r.price,
    price_unit: 'triệu',
    negotiable: r.negotiable,
    area: r.area,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    floors: r.floors,
    floor_number: r.floor_number,
    direction: r.direction,
    furniture: r.furniture,
    features: r.features,
    images: [],                      // client tự vẽ ảnh từ hue + tên dự án
    project_id: r.project_id,
    project_name: r.project_name,
    project_slug: r.project_slug,
    project_hue: r.project_hue,
    project_lat: r.project_lat,
    project_lng: r.project_lng,
    project_lat_approximate: r.project_approx,
    project_amenities: null,
    tower_name: r.tower_name,
    ward_id: null,
    ward_name: null,
    district_id: r.district_id,
    district_name: r.district_name,
    street_id: null,
    agent_id: null,
    is_sponsored: r.is_sponsored,
    view_count: r.view_count,
    view_count_7d: r.view_count_7d,
    published_at: r.published_at,
    created_at: r.published_at,
  };
}

async function getJson<T>(name: string): Promise<T> {
  /* `default` chứ không phải `force-cache`.
     `force-cache` = dùng bản cache cũ kể cả khi đã hết hạn → sau mỗi lần
     sinh lại dữ liệu, người dùng vẫn thấy kết quả cũ mà không có lý do gì
     để nghi. `default` để trình duyệt tự quyết định theo Cache-Control của
     máy chủ: GitHub Pages cache ~10 phút rồi hỏi lại, còn khi phát triển thì
     server gửi no-cache nên luôn thấy dữ liệu mới. */
  const res = await fetch(`${BASE}/${name}`, { cache: 'default' });
  if (!res.ok) throw new Error(`Không tải được ${name} (HTTP ${res.status})`);
  return res.json();
}

/** Tải một lần rồi cache — mọi trang dùng chung */
function load(): Promise<Dataset> {
  if (!cache) {
    cache = Promise.all([
      getJson<any[]>('districts.json'),
      getJson<any[]>('projects.json'),
      getJson<RawListing[]>('listings.json'),
      getJson<any[]>('map.json'),
    ]).then(([districts, projects, raw, mapProjects]) => ({
      districts, projects, mapProjects,
      listings: raw.map(hydrate),
    }));
  }
  return cache;
}

/* =============================================================================
 *  API giả lập — cùng chữ ký với bản gọi qua Worker
 * ========================================================================== */

type Filters = {
  type?: string; district?: number; ward?: number; project?: string;
  min?: number; max?: number; bedrooms?: number; q?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  page?: number; per_page?: number;
};

const SORTS: Record<string, (a: ListingCard, b: ListingCard) => number> = {
  newest: (a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  popular: (a, b) => (b.view_count_7d ?? 0) - (a.view_count_7d ?? 0),
};

export const staticApi = {
  async listings(f: Filters): Promise<ListingPage> {
    const ds = await load();
    let rows = ds.listings;

    // ƯU TIÊN nhận diện QUẬN (tên cũ / viết tắt) trước khi tìm theo tên
    if (f.q?.trim()) {
      const key = fold(f.q);
      const hits = ds.districts.filter(
        (d) => fold(d.name_new).includes(key)
          || (d.aliases || []).some((a: string) => fold(a).includes(key)));
      if (hits.length) {
        const ids = new Set(hits.map((d) => d.id));
        rows = rows.filter((l) => l.district_id != null && ids.has(l.district_id));
      } else {
        rows = rows.filter((l) =>
          fold(l.title).includes(key)
          || fold(l.project_name).includes(key)
          || fold(l.district_name).includes(key));
      }
    }

    if (f.type) rows = rows.filter((l) => l.type === f.type);
    if (f.project) rows = rows.filter((l) => l.project_id === f.project);
    if (f.district) rows = rows.filter((l) => l.district_id === f.district);
    if (f.bedrooms) rows = rows.filter((l) => (l.bedrooms ?? 0) >= f.bedrooms!);
    if (f.min != null) rows = rows.filter((l) => l.price >= f.min!);
    if (f.max != null) rows = rows.filter((l) => l.price <= f.max!);

    rows = [...rows].sort(SORTS[f.sort || 'newest'] ?? SORTS.newest);

    const per_page = Math.min(60, Math.max(1, f.per_page || 24));
    const page = Math.max(1, f.page || 1);

    return {
      total: rows.length, page, per_page,
      data: rows.slice((page - 1) * per_page, page * per_page),
    };
  },

  async detail(slug: string) {
    const ds = await load();
    const data = ds.listings.find((l) => l.slug === slug);
    if (!data) throw new Error('Không tìm thấy tin');
    return { data, can_reveal: false };   // không có backend nên không xem SĐT được
  },

  async adminUnits() {
    const ds = await load();
    return { districts: ds.districts, wards: [] };
  },

  async projects(q?: string) {
    const ds = await load();
    let rows = ds.projects;
    if (q) rows = rows.filter((p) => fold(p.name).includes(fold(q)));
    return { data: rows.slice(0, 60) };
  },

  async searchUnits(q: string) {
    const ds = await load();
    const key = fold(q);
    if (!key) return { data: [] };
    return {
      data: ds.districts
        .filter((d) => fold(d.name_new).includes(key)
          || (d.aliases || []).some((a: string) => fold(a).includes(key)))
        .map((d) => ({ kind: 'district', id: d.id, name: d.name_new, slug: d.slug, district_id: null })),
    };
  },

  async mapProjects() {
    const ds = await load();
    return { data: ds.mapProjects };
  },

  /** Bản tĩnh không có backend → báo rõ thay vì im lặng */
  async revealContact(): Promise<never> {
    throw new Error(
      'Bản xem thử chưa có máy chủ nên không xem được số điện thoại. ' +
      'Tính năng này sẽ hoạt động khi nối Supabase.',
    );
  },

  async submitLead(): Promise<never> {
    throw new Error('Bản xem thử chưa lưu được yêu cầu. Sẽ hoạt động khi nối Supabase.');
  },
};