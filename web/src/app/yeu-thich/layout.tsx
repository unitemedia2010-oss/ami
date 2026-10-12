import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Tin đăng yêu thích',
  description: 'Các tin đăng bạn đã lưu để xem lại và so sánh.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}