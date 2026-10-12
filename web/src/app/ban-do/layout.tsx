import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Bản đồ tin đăng bất động sản',
  description:
    'Xem tin mua bán và cho thuê trực tiếp trên bản đồ. Lọc theo khu vực, ' +
    'loại hình và dự án để tìm tin quanh vị trí bạn quan tâm.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}