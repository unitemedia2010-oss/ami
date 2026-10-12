'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ListingCard as C } from '@/lib/api';
import ListingCard, { ListingCardSkeleton, ProjectCard, type Project } from '@/components/ListingCard';
import { SectionHeader, StatCard, Note } from '@/components/ui';
import MapView from '@/components/MapView';
import { u } from '@/lib/basePath';

/* Phím tắt dùng đúng hạng mục đã gom trong tools/build_27k.mjs.
   Trước đây dùng `?q=chung cư` — tức tìm trong TIÊU ĐỀ tin, nên những tin
   chung cư có tiêu đề kiểu "4m x 11m (88 m²), căn góc..." sẽ không bao giờ
   ra. Dùng tham số `cat` lọc theo trường `category` mới đúng. */
const SHORTCUTS = [
  { t: 'Căn hộ chung cư', href: '/tim-kiem/?cat=chung-cu', i: 'lucide:building-2' },
  { t: 'Nhà phố, nhà hẻm', href: '/tim-kiem/?cat=nha-pho', i: 'lucide:house' },
  { t: 'Mặt bằng KD', href: '/tim-kiem/?cat=mat-bang', i: 'lucide:store' },
  { t: 'Đất nền',        href: '/tim-kiem/?cat=dat',      i: 'lucide:land-plot' },
  { t: 'Shophouse',     href: '/tim-kiem/?cat=shophouse', i: 'lucide:shopping-bag' },
  { t: '2 phòng',       href: '/tim-kiem/?bedrooms=2',  i: 'lucide:bed-double' },
  { t: '3 phòng trở lên', href: '/tim-kiem/?bedrooms=3', i: 'lucide:bed-double' },
  { t: 'Dưới 1 tỷ',    href: '/tim-kiem/?max=1000',    i: 'lucide:wallet' },
];

export default function HomePage() {
  const [hot, setHot] = useState<C[]>([]);
  const [newest, setNewest] = useState<C[]>([]);
  const [rent, setRent] = useState<C[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /* Trang chủ chỉ đọc index.json (30 KB) chứ không quét 27.659 tin.
       `api.listings` không lọc theo quận thì phải tải cả 23 file — mất vài
       giây chỉ để hiện 24 thẻ. Tin nổi bật đã được chọn sẵn lúc sinh dữ liệu. */
    Promise.all([
      api.featured(8).catch(() => null),
      api.featured(8).catch(() => null),
      api.byType('rent', 8).catch(() => null),
      api.projects().catch(() => null),
    ]).then(([h, n, r, p]) => {
      if (h) setHot(h.data as C[]);
      if (n) setNewest(n.data as C[]);
      if (r) setRent(r.data as C[]);
      if (p) setProjects((p.data || []).slice(0, 8) as Project[]);
      setLoading(false);
    });
  }, []);

  return (
    <>
      {/* ================================================================= HERO */}
      <section className="relative overflow-hidden bg-liquid">
        <div aria-hidden className="absolute inset-0 bg-grid" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
            {/* ------------------------------------------------------ nội dung */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                               glass-dark text-white text-[13px] font-semibold mb-6 animate-rise">
                <iconify-icon icon="lucide:map-pin" className="text-gold-300" />
                TP. Hồ Chí Minh — 21 đơn vị hành chính
              </span>

              <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.08] mb-6
                             text-white animate-rise">
                Tìm nhà đất
                <br />
                <span className="grad-text-anim">Sài Gòn</span> chính xác
              </h1>

              <p className="text-gold-100/85 text-base md:text-lg leading-relaxed mb-8
                            max-w-xl animate-rise">
                Mua bán và cho thuê căn hộ, chung cư. Tìm theo tên quận
                <b className="text-white"> cũ </b>
                lẫn tên đơn vị hành chính <b className="text-white">mới</b> sau sáp nhập.
              </p>

              <form action="/tim-kiem" className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                <div className="flex-1 glass rounded-2xl px-5 py-3.5 flex items-center gap-3
                                transition-shadow duration-300 focus-within:shadow-glow">
                  <iconify-icon icon="lucide:search" className="text-gold-300 text-xl shrink-0" />
                  <input
                    name="q"
                    placeholder="Quận 9, Thủ Đức, Vinhomes…"
                    aria-label="Từ khoá tìm kiếm"
                    className="flex-1 bg-transparent text-white text-[15px] font-medium
                               placeholder:text-white/50 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="shine h-14 px-8 rounded-2xl bg-grad-flame text-white
                             font-extrabold text-[15px] shadow-glow-lg
                             hover:-translate-y-0.5 hover:shadow-glow
                             transition-all duration-300 inline-flex items-center
                             justify-center gap-2 shrink-0"
                >
                  Tìm kiếm
                  <iconify-icon icon="lucide:arrow-right" />
                </button>
              </form>

              {/* ⚠ ĐÃ BỎ dãy chip "Tìm nhanh" ở đây.
                  Lý do: (1) nó lặp đúng những gì thanh đầu trang đã hiện,
                  khiến quận xuất hiện ở ba nơi trên cùng một màn hình;
                  (2) dãi này THIẾU class `text-white` nên chữ kế thừa màu
                  mặc định — đen trên nền tối, không đọc được. Sửa màu thì
                  vẫn nên bỏ vì đã trùng lặp. Link khu vực còn ở thanh đầu
                  trang (khổ ≥ 1280px), menu mobile và trang /quan. */}
            </div>

            {/* --------------------------------------------------- thẻ số liệu */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                ['lucide:building',    'Tin đăng',      '27.000+'],
                ['lucide:building-2',  'Dự án',        '190+'],
                ['lucide:map',         'Quận / Huyện', '21'],
                ['lucide:map-pinned',  'Phường / Xã',  '168'],
              ].map(([ic, label, value], i) => (
                <div
                  key={label}
                  className="glass rounded-2xl p-5 hover:-translate-y-1 hover:bg-white/20
                             transition-all duration-300 animate-rise"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <div className="w-11 h-11 rounded-xl bg-grad-gold text-flame-900
                                  grid place-items-center mb-3 shadow-glow">
                    <iconify-icon icon={ic} className="text-xl" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gold-200/90">
                    {label}
                  </p>
                  <p className="text-2xl font-extrabold text-white mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* đường cong chuyển sang nội dung — nối liền hai vùng màu */}
        <div aria-hidden
             className="absolute bottom-0 left-0 right-0 h-16 bg-cream-100
                        [clip-path:ellipse(75%_100%_at_50%_100%)]" />
      </section>

      {/* ================================================================ nội dung */}
      <div className="relative -mt-2 bg-aurora min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
          {/* ------------------------------------------------------------ lối tắt */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-16">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.t}
                href={s.href}
                className="group bg-white/85 backdrop-blur p-5 rounded-2xl border border-cream-300
                           shadow-soft hover:-translate-y-1 hover:border-transparent
                           hover:shadow-lift transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold-300 to-amber-500
                                text-flame-900 grid place-items-center mb-3
                                group-hover:bg-grad-flame group-hover:text-white
                                group-hover:shadow-glow transition-all duration-300">
                  <iconify-icon icon={s.i} className="text-2xl" />
                </div>
                <span className="block text-[13px] font-bold text-coal-800 leading-snug">
                  {s.t}
                </span>
              </Link>
            ))}
          </section>

          {/* --------------------------------------------------------------- dự án */}
          <section className="mb-16">
            <SectionHeader title="Dự án nổi bật" sub="Chung cư đang có tin bán & cho thuê"
                            href="/du-an" />
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}
              </div>
            ) : projects.length === 0 ? (
              <Note tone="info" title="Chưa có dữ liệu dự án">
                Chạy script nạp danh sách dự án để hiển thị mục này.
              </Note>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {projects.map((p) => <ProjectCard key={p.id} p={p} />)}
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------- tin nổi bật */}
          <section className="mb-16">
            <SectionHeader title="Tin nổi bật" sub="Được xem nhiều nhất"
                            href="/tim-kiem/?sort=popular" />
            <ListingRow items={hot} loading={loading} />
          </section>

          {/* -------------------------------------------------------------- tin mới */}
          <section className="mb-16">
            <SectionHeader title="Tin đăng mới nhất" sub="Cập nhật liên tục"
                            href="/tim-kiem/?sort=newest" />
            <ListingRow items={newest} loading={loading} />
          </section>

          {/* ------------------------------------------------------------ cho thuê */}
          <section className="mb-16">
            <SectionHeader title="Căn hộ cho thuê" sub="Giá tính theo tháng"
                            href="/tim-kiem/?type=rent" />
            <ListingRow items={rent} loading={loading} />
          </section>

          {/* ------------------------------------------------------------ bản đồ */}
          <section className="mb-16">
            <SectionHeader title="Dự án trên bản đồ"
                            sub="Xem vị trí các dự án chung cư tại TP.HCM"
                            href="/ban-do" hrefLabel="Bản đồ đầy đủ" />
            <HomeMap />
          </section>

          {/* -------------------------------------------------------------- SEO text */}
          <section className="mb-16">
            <div className="relative overflow-hidden rounded-2xl bg-liquid px-6 md:px-10 py-10">
              <div aria-hidden className="absolute inset-0 bg-grid" />
              <div className="relative">
                <h2 className="text-2xl font-extrabold text-white mb-3">
                  Tìm nhà đất TP.HCM theo khu vực
                </h2>
                <p className="text-gold-100/90 text-[14px] leading-relaxed mb-6 max-w-3xl">
                  Trang tổng hợp tin mua bán và cho thuê tại TP.HCM. Gõ
                  <b className="text-white"> tên quận cũ</b> (quận 1, quận 7, Thủ Đức…)
                  vẫn ra kết quả đúng, dù hệ thống hành chính đã sáp nhập năm 2025.
                </p>

                {/* ⚠ Trước đây liệt kê 21 quận bằng 21 pill liên tiếp — chiếm
                    cả màn hình cho một danh sách chữ, lại phần lớn là khu vực
                    chưa có tin nào. Nay chỉ liệt kê khu vực thực sự có dữ
                    liệu, phần đầy đủ để ở trang /quan.
                    Màu: nền kính tối + chữ trắng đậm đặc — đọc chắc chắn
                    trên mọi nền, không phụ thuộc lớp nền phía sau. */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5',
                    'Quận 6', 'Quận 8', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình',
                  ].map((n) => (
                    <Link key={n} href={`/tim-kiem/?q=${encodeURIComponent(n)}`}
                          className="px-3.5 py-1.5 rounded-full bg-black/35
                                     border border-white/30 text-[12.5px] font-semibold
                                     text-white whitespace-nowrap
                                     hover:bg-grad-flame hover:border-transparent
                                     hover:-translate-y-0.5
                                     transition-all duration-300">
                      {n}
                    </Link>
                  ))}

                  <Link href="/quan"
                        className="inline-flex items-center gap-1.5 px-4 py-1.5
                                   rounded-full bg-grad-gold text-flame-900
                                   text-[12.5px] font-extrabold whitespace-nowrap
                                   shadow-glow hover:-translate-y-0.5
                                   transition-all duration-300">
                    Tất cả khu vực
                    <iconify-icon icon="lucide:arrow-right" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------------- CTA */}
          <section className="grad-ring rounded-2xl px-6 md:px-12 py-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-grad-flame text-white grid place-items-center
                            mx-auto mb-5 shadow-glow-lg animate-pulse-ring">
              <iconify-icon icon="lucide:badge-plus" className="text-3xl" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-coal-900 mb-3">
              Đăng tin bất động sản miễn phí
            </h2>
            <p className="text-coal-600 text-[15px] mb-8 max-w-lg mx-auto">
              Đăng tin trong 2 phút. Xem số điện thoại người mua không giới hạn,
              không tính phí.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dang-tin" className="btn-lg shine bg-grad-flame text-white
                                              shadow-glow hover:-translate-y-1 hover:shadow-glow-lg
                                              transition-all duration-300 inline-flex
                                              items-center justify-center gap-3">
                Đăng tin ngay
                <iconify-icon icon="lucide:arrow-right-circle" />
              </Link>
              <Link href="/huong-dan" className="btn-lg btn-outline">Hướng dẫn đăng tin</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/** Bản đồ nhúng ở trang chủ — chỉ 40 dự án để bản đồ nhẹ */
function HomeMap() {
  const [points, setPoints] = useState<any[]>([]);

  useEffect(() => {
    api.mapProjects()
      .then((r) => {
        if (!r?.data) return;
        setPoints(
          r.data.slice(0, 40).map((p: any) => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            address: p.address,
            approximate: p.approximate,
            price: p.listings ? `${p.listings} tin` : null,
            /* Bọc u(): <a> phẳng trong popup Leaflet, không có basePath. */
            href: u(`/tim-kiem/?project=${p.id}`),
          })),
        );
      })
      .catch(() => {});
  }, []);

  if (points.length === 0) return null;
  return <MapView points={points} height="h-[420px]" showApproxWarning={false} />;
}

function ListingRow({ items, loading }: { items: C[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="listing-grid">
        {Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur rounded-2xl border border-cream-300
                      py-12 text-center text-coal-400 text-sm">
        Chưa có dữ liệu
      </div>
    );
  }
  return (
    <div className="listing-grid">
      {items.map((l) => <ListingCard key={l.id} l={l} />)}
    </div>
  );
}