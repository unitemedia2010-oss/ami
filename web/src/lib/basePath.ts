/**
 * =============================================================================
 *  Tiền tố đường dẫn khi deploy ở project site của GitHub
 *
 *  Trang nằm ở https://unitemedia2010-oss.github.io/ami/ nên mọi đường dẫn
 *  phải có tiền tố /ami. Next.js tự gắn cho <Link>, nhưng thẻ <a> phẳng thì
 *  KHÔNG — dùng thẳng sẽ nhảy ra ngoài thư mục con và gặp 404.
 *
 *  Dùng:  <a href={u('/ban-do')}>Bản đồ</a>
 *         <img src={u('/data/listings.json')} />
 * ========================================================================== */

export const BP = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Gắn tiền tố vào một đường dẫn nội bộ bắt đầu bằng "/" */
export function u(path: string): string {
  if (!path.startsWith('/')) return `${BP}/${path}`;
  return `${BP}${path}`;
}