import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập tài khoản SGREALTY để lưu tin yêu thích và quản lý tin đăng.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}