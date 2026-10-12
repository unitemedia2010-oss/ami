import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Bản đồ tin đăng (giao diện Estates)',
  description:
    'Giao diện bản đồ chia đôi: bản đồ bên trái, thẻ tin đăng bên phải. ' +
    'Chỉ hiện tin có thật trong hệ thống kèm toạ độ đã định vị.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}