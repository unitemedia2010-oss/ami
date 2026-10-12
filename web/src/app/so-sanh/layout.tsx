import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'So sánh tin đăng',
  description:
    'Đặt cạnh nhau tối đa 4 tin đăng để so sánh diện tích, giá, phòng ngủ ' +
    'và vị trí của từng căn.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}