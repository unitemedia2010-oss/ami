import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/* Trang /tim-kiem là client component ('use client' trong page.tsx) nên không
 * export được metadata — đặt ở layout.tsx cùng cấp là đường duy nhất. */
export const metadata: Metadata = {
  title: 'Tìm kiếm tin mua bán & cho thuê',
  description:
    'Tìm tin bất động sản tại TP.HCM theo quận, dự án, giá và loại hình. ' +
    'Gõ tên quận cũ (quận 1, quận 7, Thủ Đức…) vẫn ra kết quả đúng.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}