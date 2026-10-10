import Link from 'next/link';

const COLS = [
  {
    title: 'Mua bán',
    links: [
      ['Căn hộ chung cư', '/tim-kiem/?type=sell'],
      ['Chung cư mini', '/tim-kiem/?q=mini'],
      ['Nhà phố', '/tim-kiem/?q=nhà phố'],
      ['Đất nền', '/tim-kiem/?q=đất'],
      ['Tin đăng mới', '/tim-kiem/?sort=newest'],
    ],
  },
  {
    title: 'Cho thuê',
    links: [
      ['Căn hộ cho thuê', '/tim-kiem/?type=rent'],
      ['Cho thuê theo quận', '/quan'],
      ['Văn phòng cho thuê', '/tim-kiem/?type=rent'],
      ['Cửa hàng cho thuê', '/tim-kiem/?type=rent'],
    ],
  },
  {
    title: 'Dự án',
    links: [
      ['Tất cả dự án', '/du-an'],
      ['Bản đồ dự án', '/ban-do'],
      ['So sánh dự án', '/so-sanh'],
      ['Dự án nổi bật', '/du-an'],
      ['Khu vực phía Đông', '/quan/thu-duc'],
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      ['Đăng tin miễn phí', '/dang-tin'],
      ['Đăng nhập', '/dang-nhap'],
      ['Quy trình đăng tin', '/huong-dan'],
      ['Yêu thích', '/yeu-thich'],
      ['Liên hệ', '/lien-he'],
    ],
  },
];

const SOCIAL = [
  ['lucide:facebook', 'https://facebook.com'],
  ['lucide:instagram', 'https://instagram.com'],
  ['lucide:youtube', 'https://youtube.com'],
] as const;

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-liquid mt-16">
      <div aria-hidden className="absolute inset-0 bg-grid" />

      {/* quầng sáng vàng ở rìa trên */}
      <div
        aria-hidden
        className="absolute -top-40 left-1/4 w-[42rem] h-[42rem] rounded-full
                   bg-gold-400/25 blur-[110px] pointer-events-none"
      />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-14">
          {/* ------------------------------------------------------- thương hiệu */}
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="w-11 h-11 rounded-xl bg-grad-flame grid place-items-center
                               text-white text-2xl shadow-glow">
                <iconify-icon icon="lucide:flame" />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                SG<span className="grad-text-anim">REALTY</span>
              </span>
            </Link>

            <p className="text-gold-100/75 text-sm leading-relaxed">
              Hệ thống phân phối bất động sản hàng đầu tại TP.HCM. Tìm kiếm được theo cả
              tên quận cũ lẫn tên đơn vị hành chính mới sau sáp nhập.
            </p>

            <div className="flex gap-3">
              {SOCIAL.map(([icon, href]) => (
                <a
                  key={icon}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`SGREALTY trên ${icon.split(':')[1]}`}
                  className="w-11 h-11 rounded-full glass-dark text-white
                             grid place-items-center text-lg
                             hover:bg-grad-flame hover:-translate-y-1 hover:shadow-glow
                             transition-all duration-300"
                >
                  <iconify-icon icon={icon} />
                </a>
              ))}
            </div>
          </div>

          {/* -------------------------------------------------------- cột liên kết */}
          {COLS.map((c) => (
            <div key={c.title}>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-grad-flame" />
                {c.title}
              </h3>
              <ul className="space-y-2.5">
                {c.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-gold-100/70 text-sm hover:text-gold-300
                                 transition-colors duration-200 inline-flex items-center gap-1.5
                                 hover:gap-2.5"
                    >
                      <span className="w-0 h-px bg-gold-400 transition-all duration-300
                                       group-hover:w-3" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* --------------------------------------------------------- CTA cuối */}
        <div className="grad-ring rounded-2xl p-6 md:p-8 mb-12 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-coal-900">
            Có tin bất động sản cần bán?
          </h2>
          <p className="text-coal-600 text-[15px] mb-6 max-w-lg mx-auto">
            Đăng tin miễn phí. Xem số điện thoại người mua không giới hạn số lượt,
            không tính phí.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dang-tin" className="btn-lg shine bg-grad-flame text-white
                                              shadow-glow hover:-translate-y-0.5 hover:shadow-glow-lg
                                              transition-all duration-300 inline-flex
                                              items-center justify-center">
              Đăng tin ngay
              <iconify-icon icon="lucide:arrow-right-circle" />
            </Link>
            <Link href="/lien-he" className="btn-lg btn-outline">
              Liên hệ hợp tác
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------ thanh pháp lý */}
        <div className="border-t border-white/[0.12] pt-7">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[12.5px]">
            <p className="text-gold-100/60">
              © {new Date().getFullYear()} SGREALTY. Hệ thống phân phối bất động sản Sài Gòn.
            </p>
            <nav className="flex flex-wrap items-center gap-5">
              {[
                ['Điều khoản', '/dieu-khoan'],
                ['Quyền riêng tư', '/quyen-rieng-tu'],
                ['Quy trình đăng tin', '/huong-dan'],
                ['Liên hệ', '/lien-he'],
              ].map(([label, href]) => (
                <Link key={label} href={href}
                      className="text-gold-100/60 hover:text-gold-300 transition-colors duration-200">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}