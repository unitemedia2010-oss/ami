/**
 * =============================================================================
 *  DANH SÁCH SO SÁNH — lưu cục bộ, tối đa 5 tin, tối thiểu 2 tin
 *
 *  Vì sao không lưu trên URL như trước:
 *   Trước đây mọi tin đã chọn nằm trong /so-sanh?ids=a,b,c — người dùng mới
 *   thấy giỏ của mình. Chọn xong rời trang là mất, phải bấm lại từ đầu.
 *   Giờ giỏ nằm ở localStorage nên đi đâu cũng còn, và còn dùng được cho
 *   bản đồ (đánh dấu vị trí các tin đang chọn).
 *
 *  Giới hạn 5 vì so sánh 6 cột trên điện thoại là không đọc nổi.
 * ========================================================================== */

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 5;

const KEY = 'sgrealty:compare';
export const COMPARE_EVENT = 'sgrealty:compare';

export interface CompareItem {
  id: string;
  slug: string;
  /** slug quận — cần để tải đúng file dữ liệu và đánh dấu trên bản đồ */
  d: string;
  title: string;
  price: number;
  type: 'sell' | 'rent';
  image: string | null;
  area: number | null;
  bedrooms: number | null;
  district_name: string | null;
  ward_name: string | null;
}

/**
 * Cache theo chuỗi JSON gốc.
 *
 * ⚠ Bắt buộc, không phải tối ưu: useSyncExternalStore so sánh tham chiếu
 * của snapshot. Nếu getCompare() trả mảng mới ở mỗi lần gọi thì React thấy
 * "dữ liệu đã đổi" vô tận và render lặp tới khi hết bộ nhớ — build của
 * trang bản đồ đã OOM đúng vì lỗi này.
 * Nên cache lại và chỉ trả mảng mới khi chuỗi JSON trong localStorage đổi.
 */
let cacheRaw: string | null = null;
let cacheVal: CompareItem[] = [];

function write(list: CompareItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  /* Cache phải cập nhật ngay: nếu không, getCompare() vẫn trả mảng cũ và
     useSyncExternalStore không thấy thay đổi → giao diện đứng yên. */
  cacheRaw = JSON.stringify(list);
  cacheVal = list;
  window.dispatchEvent(new Event(COMPARE_EVENT));
}

export function getCompare(): CompareItem[] {
  if (typeof window === 'undefined') return cacheVal;
  const raw = localStorage.getItem(KEY) || '[]';
  if (raw === cacheRaw) return cacheVal;
  cacheRaw = raw;
  try {
    const parsed = JSON.parse(raw);
    cacheVal = Array.isArray(parsed) ? parsed.filter((x) => x && x.id && x.slug) : [];
  } catch {
    cacheVal = [];
  }
  return cacheVal;
}

export function inCompare(id: string): boolean {
  return getCompare().some((x) => x.id === id);
}

/** Thêm/xoá một tin. Trả về trạng thái sau khi thay đổi. */
export function toggleCompare(item: CompareItem): { ok: boolean; full?: boolean; list: CompareItem[] } {
  const list = getCompare();
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) {
    const next = [...list.slice(0, i), ...list.slice(i + 1)];
    write(next);
    return { ok: true, list: next };
  }
  if (list.length >= COMPARE_MAX) return { ok: false, full: true, list };
  const next = [...list, item];
  write(next);
  return { ok: true, list: next };
}

export function removeCompare(id: string) {
  write(getCompare().filter((x) => x.id !== id));
}

export function clearCompare() {
  write([]);
}

/** Có đủ điều kiện để mở trang so sánh chưa */
export function canCompare(list: CompareItem[] = getCompare()): boolean {
  return list.length >= COMPARE_MIN;
}

/** URL trang so sánh */
export function compareUrl(list: CompareItem[] = getCompare()): string {
  const ids = list.map((x) => `${x.slug}|${x.d}`).join(',');
  return `/so-sanh?ids=${encodeURIComponent(ids)}`;
}