import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Bất động sản theo khu vực',
  description:
    'Tra cứu tin mua bán và cho thuê theo từng quận, huyện của TP.HCM. ' +
    'Tên quận trước sáp nhập vẫn dùng được sau khi hệ thống hành chính thay đổi.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}