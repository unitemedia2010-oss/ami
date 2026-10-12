import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description:
    'Gửi yêu cầu tư vấn cho đội ngũ SGREALTY. Chúng tôi phản hồi trong ' +
    'giờ làm việc.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}