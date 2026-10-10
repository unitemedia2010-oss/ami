import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* =============================================================================
 *  Plus Jakarta Sans — nạp qua next/font để:
 *    1. Tự tối ưu subset (chỉ tải chữ Latin + dấu cần thiết)
 *    2. Tự thêm font-display: swap → không nháy chữ (FOUT)
 *    3. CSS biến --font-jakarta được nạp sẵn, không gọi ra ngoài
 *  Đổi font chỉ cần sửa ở đây.
 * ============================================================================= */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const TS_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sgrealty.vn'),
  title: {
    default: 'SGREALTY — Mua bán & Cho thuê bất động sản Sài Gòn',
    template: '%s | SGREALTY',
  },
  description:
    'Hệ thống phân phối bất động sản hàng đầu tại TP.HCM. Mua bán và cho thuê căn hộ, ' +
    'chung cư, nhà phố. Tìm theo tên quận cũ lẫn tên đơn vị hành chính mới. ' +
    'Xem số điện thoại liên hệ miễn phí.',
  keywords: [
    'bất động sản TP.HCM', 'mua bán căn hộ', 'cho thuê chung cư',
    'SGREALTY', 'nhà bán Sài Gòn', 'căn hộ Thủ Thiêm', 'quận 2', 'quận Thủ Đức',
  ],
  applicationName: 'SGREALTY',
  authors: [{ name: 'SGREALTY' }],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'SGREALTY',
    title: 'SGREALTY — Bất động sản Sài Gòn',
    description:
      'Mua bán & cho thuê bất động sản TP.HCM. Xem số điện thoại liên hệ miễn phí.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SGREALTY — Bất động sản Sài Gòn',
    description: 'Mua bán & cho thuê bất động sản TP.HCM.',
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E5A96',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={jakarta.variable}>
      <head>
        {/*
          Iconify — cung cấp toàn bộ icon Lucide dùng chung.
          Nạp sau tương tác để không chặn render (icon chỉ là hình trang trí).
        */}
        <Script
          src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"
          strategy="afterInteractive"
        />

        {/* Turnstile — chỉ nạp khi thực sự có site key */}
        {TS_KEY && (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}