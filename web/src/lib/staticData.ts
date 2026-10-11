/**
 * =============================================================================
 *  ĐỌC DỮ LIỆU TỪ CÁC FILE JSON TĨNH
 *
 *  Dùng khi biến NEXT_PUBLIC_API_URL rỗng (mặc định khi deploy GitHub Pages).
 *  Khi nào có Supabase/Worker, chỉ cần đặt NEXT_PUBLIC_API_URL — module này
 *  không được gọi tới nữa. KHÔNG phải sửa component nào.
 *
 *  ⚠ VÌ SAO CHIA NHỎ THAY VÌ MỘT FILE LỚN
 *    27.659 tin gộp lại thành một file JSON: 15 MB thô, 2,4 MB nén. Mỗi lần
 *    mở trang tìm kiếm phải tải hết 2,4 MB — mất vài giây trên mạng di động.
 *    Chia theo quận thì mỗi lần chỉ tải file của khu vực đang xem:
 *      • có lọc theo quận  → 1 file, ~20–220 KB nén (nhanh gấp 10–100 lần)
 *      • không lọc quận    → tải cả 23 file, tương đương cách cũ
 *    Đánh đổi có ý thức, đổi lấy trải nghiệm nhanh ở trang quan trọng nhất.
 * ========================================================================== */

/* Dữ liệu nằm trong thư mục /public/data. Khi deploy lên project site của
   GitHub (…github.io/ami/) thì đường dẫn phải có tiền tố /ami — cùng biến
   mà next.config.mjs dùng cho basePath. Đặt rỗng khi chạy local. */
const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/data`;

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

/* ------------------------------------------------------------------ kiểu dữ liệu */
interface RawListing {
  id: string;
  slug: string;
  type: 'sell' | 'rent';
  title: string;
  price: number;              // LUÔN tính bằng TRIỆU — xem lib/api.ts
  area: number | null;
  bedrooms: number | null;
  district_id: number;
  district_slug: string;
  district_name: string;
  ward_name: string | null;
  street_name: string | null;
  project_name: string | null;
  category: string;
  category_raw: string | null;
  image: string | null;
  published_at: string | null;
}

interface Index {
  total: number;
  counts: Record<string, number>;
  featured: RawListing[];
}

/* --------------------------------------------------------------------- cache */
let indexP: Promise<Index> | null = null;
const loadIndex = (): Promise<Index> => (indexP ??= getJson<Index>('index.json'));

const shardP = new Map<string, Promise<RawListing[]>>();
const loadShard = (slug: string): Promise<RawListing[]> => {
  if (!shardP.has(slug)) shardP.set(slug, getJson<RawListing[]>(`d/${slug}.json`));
  return shardP.get(slug)!;
};

/** Bỏ dấu để so khớp không phân biệt dấu, giống hàm cùng loại ở Worker.
 *
 * ⚠ PHẢI dùng dạng escape \u0300-\u036f, KHÔNG gõ ký tự thật.
 *   Dải ký tự tổ hợp gõ tay đã từng bị hỏng thành /['-?]/g khi lưu file —
 *   biểu thức vẫn "hợp lệ" nên build không báo lỗi, nhưng mọi tìm kiếm
 *   tiếng Việt không dấu ("go vap") đều không khớp "Gò Vấp".
 *   Dạng escape chỉ gồm ký tự ASCII nên không thể bị biến đổi khi qua bất kỳ
 *   bước encode nào.
 */
const fold = (s?: string | null) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd').replace(/\u0110/g, 'D').toLowerCase().trim();

/* =============================================================================
 *  Bộ lọc
 * ========================================================================== */
type Filters = {
  type?: string; district?: number; ward?: number; project?: string;
  min?: number; max?: number; bedrooms?: number; q?: string;
  category?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  page?: number; per_page?: number;
};

const SORTS: Record<string, (a: RawListing, b: RawListing) => number> = {
  newest: (a, b) => (b.published_at || '').localeCompare(a.published_at || ''),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  popular: (a, b) => (b.price >= 1000 ? 0 : 1) - (a.price >= 1000 ? 0 : 1),
};

/**
 * Chuỗi tìm kiếm có khớp quận nào không.
 * Ưu tiên nhận diện QUẬN (tên mới + tên cũ/viết tắt) trước khi tìm tự do.
 * Nhờ vậy "td1" ra Quận 1, "go vap" ra Gò Vấp.
 *
 * ⚠ PHẢI ưu tiên khớp CHÍNH XÁC, không dùng `includes` ngay.
 *    Đã xảy ra: "td1" trả về 5.483 tin thay vì 1.191 vì "td1" là chuỗi
 *    con của "td10", "td11", "td12". Tương tự "quận 1" sẽ nuốt cả Quận 10,
 *    11, 12 — tức gần 5.500 tin sai quận. Lỗi này chỉ lộ ra khi dữ liệu có
 *    đủ 23 quận; bộ 9 quận cũ không có "Quận 1x" nên không thấy.
 */
function districtsInQuery(districts: any[], q: string) {
  const key = fold(q);
  if (!key) return [];

  // 1. khớp chính xác tên hoặc bí danh — chỉ một quận, đáng tin tuyệt đối
  const exact = districts.filter(
    (d) => fold(d.name_new) === key
      || (d.aliases || []).some((a: string) => fold(a) === key));
  if (exact.length) return exact;

  // 2. không khớp chính xác thì mới thử khớp một phần tên
  //    ("thu duc" khi gõ "đức" vẫn ra, nhưng gõ "quận 1" thì đã chặn ở bước 1)
  return districts.filter((d) => fold(d.name_new).includes(key));
}

export const staticApi = {
  /* ------------------------------------------------------------------ danh sách */
  async listings(f: Filters) {
    const [index, units] = await Promise.all([loadIndex(), this.adminUnits()]);
    const districts = units.districts;

    /* xác định cần tải file nào */
    let slugs: string[] = [];
    let qDistrict: any[] = [];

    if (f.district) {
      const d = districts.find((x) => x.id === f.district);
      slugs = d ? [d.slug] : [];
    } else if (f.q?.trim()) {
      qDistrict = districtsInQuery(districts, f.q.trim());
      if (qDistrict.length) slugs = qDistrict.map((d) => d.slug);
    }
    if (!slugs.length) slugs = Object.keys(index.counts);

    const groups = await Promise.all(slugs.map((s) => loadShard(s)));
    let rows = groups.flat();

    /* tìm tự do khi chuỗi KHÔNG phải tên quận */
    if (f.q?.trim() && !qDistrict.length) {
      const key = fold(f.q.trim());
      rows = rows.filter((l) =>
        fold(l.title).includes(key)
        || fold(l.project_name).includes(key)
        || fold(l.ward_name).includes(key)
        || fold(l.street_name).includes(key));
    }

    if (f.type) rows = rows.filter((l) => l.type === f.type);
    if (f.category) rows = rows.filter((l) => l.category === f.category);
    if (f.project) rows = rows.filter((l) => fold(l.project_name).includes(fold(f.project)));
    if (f.bedrooms) rows = rows.filter((l) => (l.bedrooms ?? 0) >= f.bedrooms!);
    if (f.min != null) rows = rows.filter((l) => l.price >= f.min!);
    if (f.max != null) rows = rows.filter((l) => l.price <= f.max!);

    rows = [...rows].sort(SORTS[f.sort || 'newest'] ?? SORTS.newest);

    const per_page = Math.min(60, Math.max(1, f.per_page || 24));
    const page = Math.max(1, f.page || 1);

    return {
      total: rows.length, page, per_page,
      data: rows.slice((page - 1) * per_page, page * per_page).map(baiViet),
    };
  },

  /* ------------------------------------------------------------- trang chủ */
  async featured(n = 8) {
    const index = await loadIndex();
    return { data: index.featured.slice(0, n) };
  },

  async byType(type: 'sell' | 'rent', n = 8) {
    const index = await loadIndex();
    return { data: index.featured.filter((x) => x.type === type).slice(0, n) };
  },

  /* ------------------------------------------------------------------ chi tiết */
  /**
   * `district` là slug quận. Bắt buộc phải có: 27.659 tin thì bảng tra
   * slug→quận nặng ~380 KB, không đáng tải chỉ để mở một tin. Các link
   * trong ứng dụng đều tự mang theo quận nên người dùng không phải làm gì.
   */
  async detail(slug: string, district: string) {
    const rows = await loadShard(district);
    const data = rows.find((l) => l.slug === slug);
    if (!data) throw new Error('Không tìm thấy tin');
    return { data: baiViet(data), can_reveal: false };
  },

  /* ------------------------------------------------------- đơn vị hành chính */
  async adminUnits() {
    return { districts: await getJson<any[]>('districts.json'), wards: [] };
  },

  /* ------------------------------------------------------------------ dự án */
  async projects(q?: string) {
    const p = await getJson<any[]>('projects.json');
    let rows = p;
    if (q) rows = rows.filter((x) => fold(x.name).includes(fold(q)));
    return { data: rows.slice(0, 60) };
  },

  /* ------------------------------------------------------------ tìm đơn vị */
  async searchUnits(q: string) {
    const districts = await getJson<any[]>('districts.json');
    const hits = districtsInQuery(districts, q);
    return {
      data: hits.map((d) => ({
        kind: 'district', id: d.id, name: d.name_new, slug: d.slug, district_id: null,
      })),
    };
  },

  /* ---------------------------------------------------------------- bản đồ */
  async mapProjects() {
    return await getJson<{ data: any[] }>('map.json');
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

/* ---------------------------------------------------------------- đổi tên field */
/**
 * File JSON dùng tên rút gọn cho tiện mã. Hàm này đổi sang đúng tên mà
 * component dùng, để phía component không cần biết mình đang chạy ở chế độ nào.
 * Quan trọng: `price` giữ nguyên giá trị, KHÔNG nhân thêm — vẫn là TRIỆU.
 */
function baiViet(r: RawListing) {
  return {
    id: r.id,
    slug: r.slug,
    type: r.type,
    title: r.title,
    price: r.price,
    price_unit: 'triệu' as const,
    negotiable: false,
    area: r.area,
    bedrooms: r.bedrooms,
    bathrooms: null,
    floors: null,
    floor_number: null,
    direction: null,
    furniture: null,
    features: null,
    images: r.image ? [r.image] : null,
    project_id: null,
    project_name: r.project_name,
    project_slug: null,
    project_lat: null,
    project_lng: null,
    project_lat_approximate: null,
    project_amenities: null,
    /** dùng để mở đúng file dữ liệu khi bấm vào tin */
    district_slug: r.district_slug,
    ward_name: r.ward_name,
    street_name: r.street_name,
    category: r.category,
    district_id: r.district_id,
    district_name: r.district_name,
    tower_name: null,
    street_id: null,
    agent_id: null,
    is_sponsored: false,
    view_count: 0,
    view_count_7d: 0,
    published_at: r.published_at,
    created_at: r.published_at || '',
  };
}