import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Dự án bất động sản',
  description:
    'Danh sách dự án, chung cư và khu đô thị tại TP.HCM kèm số tin đăng ' +
    'đang có trên hệ thống và vị trí trên bản đồ.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}