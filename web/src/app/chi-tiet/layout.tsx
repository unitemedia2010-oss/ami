import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/* Trang /chi-tiet đọc tin từ URL, không phải generateMetadata — nên tiêu đề
 * ở đây là tiêu đề chung của trang. Muốn tiêu đề riêng cho từng tin (tên
 * tin + quận + giá) thì phải tách trang thành server component đọc
 * searchParams; đó là việc lớn hơn, chưa làm ở đây. */
export const metadata: Metadata = {
  title: 'Chi tiết tin đăng bất động sản',
  description:
    'Xem đầy đủ thông tin tin đăng: diện tích, phòng ngủ, hướng, pháp lý, ' +
    'mức giá và vị trí trên bản đồ.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}