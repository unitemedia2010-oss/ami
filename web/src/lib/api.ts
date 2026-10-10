/* =============================================================================
 *  Chọn nguồn dữ liệu
 *
 *  NEXT_PUBLIC_API_URL rỗng  → chế độ TĨNH: đọc file JSON trong /public/data.
 *                                Dùng khi deploy GitHub Pages (trang không có
 *                                máy chủ nào để gọi).
 *  NEXT_PUBLIC_API_URL có giá trị → gọi Worker/Supabase thật.
 *
 *  Đây là điểm DUY NHẤT cần sửa khi chuyển đổi. Component không cần biết.
 * ========================================================================== */
const API = process.env.NEXT_PUBLIC_API_URL || '';

import { staticApi } from './staticData';

/** true = đang chạy bản tĩnh, không có máy chủ phía sau */
export const STATIC_MODE = API === '';

/* ============================================================
 *  Kiểu dữ liệu
 * ========================================================== */
export type ListingType = 'sell' | 'rent';

export interface ListingCard {
  id: string;
  slug: string;
  type: ListingType;
  /** mã tin hiển thị cho người bán, ví dụ PR-00042 */
  reference_code?: string | null;
  title: string;
  price: number;            // luôn tính bằng TRIỆU
  price_unit: 'triệu' | 'tỷ';
  negotiable: boolean;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  floor_number: number | null;
  direction: string | null;
  furniture: string | null;
  features: string[] | null;
  images: string[] | null;
  project_id: string | null;
  tower_name: string | null;
  is_sponsored: boolean;
  ward_id: number | null;
  district_id: number | null;
  street_id: number | null;
  agent_id: string | null;
  published_at: string | null;
  created_at: string;
  // từ view listing_cards
  ward_name?: string | null;
  ward_slug?: string | null;
  district_name?: string | null;
  district_slug?: string | null;
  project_name?: string | null;
  project_slug?: string | null;
  /** số màu 0–360 để vẽ ảnh đại diện khi không có ảnh thật */
  project_hue?: number | null;
  project_lat?: number | null;
  project_lng?: number | null;
  /** true = toạ độ chỉ là tâm quận, chưa phải vị trí chính xác */
  project_lat_approximate?: boolean | null;
  project_amenities?: string[] | null;
  view_count?: number;
  view_count_7d?: number;
}

export interface ListingPage {
  total: number;
  page: number;
  per_page: number;
  data: ListingCard[];
}

export interface ContactResult {
  contact_name: string | null;
  phone_masked: string | null;
  phone_full: string | null;
  zalo: string | null;
  full_address: string | null;
  owner_name: string | null;
}

export interface AdminUnit {
  id: number; code: string; name_new: string;
  name_old: string | null; slug: string;
}
export interface AdminWard {
  id: number; district_id: number; code: string; name_new: string; slug: string;
}

/** Dự án có toạ độ — nguồn cho trang bản đồ */
export interface MapProject {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  district_name: string | null;
  /** true = toạ độ mới là tâm quận, chưa phải vị trí thật của dự án */
  approximate: boolean;
  listings: number;
}

export interface Filters {
  type?: ListingType;
  district?: number;
  ward?: number;
  project?: string;
  min?: number;
  max?: number;
  bedrooms?: number;
  q?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  page?: number;
  per_page?: number;
}

/* ============================================================
 *  Gọi API qua Worker
 *  ⚠ KHÔNG BAO GIỜ gọi thẳng Supabase từ trình duyệt cho dữ liệu nhạy cảm
 * ========================================================== */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function buildQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.type) p.set('type', f.type);
  if (f.district) p.set('district', String(f.district));
  if (f.ward) p.set('ward', String(f.ward));
  if (f.project) p.set('project', f.project);
  if (f.min != null) p.set('min', String(f.min));
  if (f.max != null) p.set('max', String(f.max));
  if (f.bedrooms) p.set('bedrooms', String(f.bedrooms));
  if (f.q) p.set('q', f.q);
  if (f.sort) p.set('sort', f.sort);
  p.set('page', String(f.page ?? 1));
  p.set('per_page', String(f.per_page ?? 24));
  return p.toString();
}

/* =============================================================================
 *  Rẽ nhánh: tĩnh hay máy chủ thật
 *
 *  Giữ nguyên chữ ký của các hàm bên dưới ở cả hai chế độ. Chỉ phần "gọi mạng"
 *  khác nhau — đọc file JSON hay gọi Worker.
 * ========================================================================== */

const remote = {
  listings: (f: Filters) => call<ListingPage>(`/api/listings?${buildQuery(f)}`),

  detail: (slug: string) =>
    call<{ data: ListingCard; can_reveal: boolean }>(
      `/api/listings/${encodeURIComponent(slug)}`),

  adminUnits: () => call<{ districts: AdminUnit[]; wards: AdminWard[] }>('/api/admin-units'),

  projects: (q?: string) =>
    call<{ data: any[] }>(`/api/projects${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  searchUnits: (q: string) =>
    call<{ data: any[] }>(`/api/search-units?q=${encodeURIComponent(q)}`),

  /** Các dự án có toạ độ để vẽ lên bản đồ */
  mapProjects: () => call<{ data: MapProject[] }>('/api/map/projects'),

  /** Xem số điện thoại — cần token đăng nhập + Turnstile */
  revealContact: (listingId: string, token: string, turnstileToken: string) =>
    call<{ data: ContactResult }>('/api/contact/reveal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Turnstile-Token': turnstileToken },
      body: JSON.stringify({ listingId }),
    }),

  /** Gửi yêu cầu liên hệ từ form trang /lien-he */
  submitLead: (p: {
    full_name: string;
    phone: string;
    email?: string;
    message?: string;
    listing_id?: string;
    source?: string;
  }) =>
    call<{ data: { id: string } }>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(p),
    }),
};

export const api = STATIC_MODE
  ? (staticApi as unknown as typeof remote)
  : remote;

/* =============================================================================
 *  ĐỊNH DẠNG
 *
 *  Quy ước xuyên suốt: `price` LUÔN tính bằng TRIỆU.
 *     7.323 tỷ  → price = 7323
 *     15 triệu  → price = 15
 *  Chọn "tỷ" hay "triệu" là quyết định HIỂN THỊ, do hàm dưới đảm nhiệm.
 *
 *  Vì sao không lưu "7.323" + price_unit "tỷ": mọi phép so sánh, lọc và sắp
 *  xếp theo giá sẽ sai lệch theo đơn vị — căn 7 tỷ (7000 triệu) và căn 3000
 *  triệu sẽ bị so sánh như 7 với 3000.
 * ========================================================================== */
export function fmtPrice(price: number, _unit?: string | null, type?: ListingType): string {
  /* `price` LUÔN tính bằng TRIỆU — xem giải thích ở trên.
     7.323 tỷ → 7323 · 15 triệu → 15 · 20 triệu/tháng → 20 */
  const n = price >= 1000
    ? `${(price / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`
    : `${price.toLocaleString('vi-VN')} triệu`;
  return type === 'rent' ? `${n}/tháng` : n;
}

export function fmtArea(a: number | null): string {
  return a ? `${a.toLocaleString('vi-VN')} m²` : '—';
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600)   return `${Math.floor(d / 60)} phút trước`;
  if (d < 86400)  return `${Math.floor(d / 3600)} giờ trước`;
  if (d < 2592000) return `${Math.floor(d / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export const AMENITY_LABEL: Record<string, string> = {
  'hồ bơi': 'Hồ bơi', 'gym': 'Phòng gym', 'spa': 'Spa', 'trường học': 'Trường học',
  'công viên': 'Công viên', 'bbq': 'BBQ', 'hầm xe': 'Hầm xe', 'sân tennis': 'Sân tennis',
  'cà phê': 'Quán cà phê', 'cảnh sát': 'An ninh 24/7', 'siêu thị': 'Siêu thị',
  'phòng sinh hoạt chung': 'Sinh hoạt chung', 'công viên nước': 'Công viên nước',
};

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';