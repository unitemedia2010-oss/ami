'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, type AdminUnit } from '@/lib/api';

const NAV = [
  { href: '/', label: 'Trang Chủ', match: '/' },
  { href: '/du-an', label: 'Dự Án', match: '/du-an' },
  { href: '/ban-do', label: 'Bản Đồ', match: '/ban-do' },
  { href: '/so-sanh', label: 'So Sánh', match: '/so-sanh' },
  { href: '/lien-he', label: 'Liên Hệ', match: '/lien-he' },
];

/** class dùng chung cho mọi ô tìm kiếm trong header */
const SEARCH_INPUT =
  'flex-1 min-w-0 h-10 px-5 rounded-l-full text-[13.5px] font-medium ' +
  'bg-white/[0.12] backdrop-blur-xl border border-white/20 text-white ' +
  'placeholder:text-white/60 ' +
  'focus:bg-white/[0.2] focus:border-gold-400 focus:ring-2 ' +
  'focus:ring-gold-400/50 focus:outline-none transition-all duration-300';

const SEARCH_BTN =
  'shrink-0 h-10 rounded-r-full bg-grad-flame text-white font-bold text-[13px] ' +
  'shadow-glow hover:brightness-110 transition-all duration-300 ' +
  'inline-flex items-center whitespace-nowrap';

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [q, setQ] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    api.adminUnits().then((r) => setUnits(r.districts)).catch(() => setUnits([]));
  }, []);

  // ⚠ Đọc query string bằng window.location thay vì useSearchParams().
  //   useSearchParams() bắt buộc mọi trang phải bọc <Suspense>, khiến static
  //   export của /quan/[slug] không build được.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setActiveSearch(p.get('q') || p.get('type') || '');
  }, [pathname]);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* ================================================================ header */}
      <header className="sticky top-0 z-50">
        <div
          className={`absolute inset-0 bg-liquid transition-shadow duration-300 ${
            scrolled ? 'shadow-lift' : ''
          }`}
        />
        <div aria-hidden className="absolute inset-0 bg-grid" />

        <div className="relative px-4 md:px-8">
          <div className="mx-auto max-w-7xl flex items-center gap-4 h-[68px]">
            {/* ---------------------------------------------------------- logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <span className="w-10 h-10 rounded-xl bg-grad-flame grid place-items-center
                               text-white text-xl shadow-glow transition-transform
                               duration-300 group-hover:scale-105">
                <iconify-icon icon="lucide:flame" />
              </span>
              <span className="leading-tight hidden sm:block">
                <span className="block text-lg font-extrabold tracking-tight text-white">
                  SG<span className="grad-text-anim">REALTY</span>
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-gold-300">
                  Bất động sản Sài Gòn
                </span>
              </span>
            </Link>

            {/* ------------------------------------------------------ điều hướng */}
            <nav className="hidden lg:flex items-center gap-1 ml-4 shrink-0">
              {NAV.map((n) => {
                const active = n.match === '/' ? pathname === '/' : pathname?.startsWith(n.match);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative px-4 py-2 rounded-xl text-[14px] font-semibold
                                whitespace-nowrap transition-all duration-300 ${
                                  active ? 'text-white' : 'text-gold-100/85 hover:text-white'
                                }`}
                  >
                    {n.label}
                    <span
                      className={`absolute left-4 right-4 -bottom-0.5 h-0.5 rounded-full
                                  bg-grad-flame transition-all duration-300 ${
                                    active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'
                                  }`}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* ------------------------------------------------------- tài khoản */}
            <div className="hidden sm:flex items-center gap-2 ml-auto shrink-0">
              <Link
                href="/tim-kiem"
                className="hidden xl:inline-flex items-center gap-2 h-9 px-4 rounded-full
                           glass-dark text-[13px] font-semibold text-white whitespace-nowrap
                           hover:bg-white/20 transition-colors duration-300"
              >
                <iconify-icon icon="lucide:search" /> Tìm kiếm
              </Link>
              <Link
                href="/dang-nhap"
                className="h-9 px-4 inline-flex items-center rounded-full whitespace-nowrap
                           glass-dark text-[13px] font-semibold text-white
                           hover:bg-white/20 transition-colors duration-300"
              >
                Đăng Nhập
              </Link>
              <Link
                href="/dang-tin"
                className="h-9 px-5 inline-flex items-center gap-1.5 rounded-full
                           whitespace-nowrap bg-grad-gold text-[13px] font-extrabold
                           text-flame-900 shadow-glow hover:-translate-y-0.5
                           hover:shadow-glow-lg transition-all duration-300"
              >
                <iconify-icon icon="lucide:plus" /> Đăng Ký
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={open}
              className="lg:hidden ml-auto text-2xl text-white p-1.5 rounded-lg
                         hover:bg-white/15 transition-colors shrink-0"
            >
              <iconify-icon icon={open ? 'lucide:x' : 'lucide:menu'} />
            </button>
          </div>

          {/* ==================================================================
              *  Hàng tìm kiếm + khu vực
              *
              *  min-w-0 trên nav là BẮT BUỘC. Một flex item mặc định có
              *  min-width:auto nên không co lại được dưới ngưỡng nội dung.
              *  Thiếu nó, các chip quận bị nén thành dải hẹp, chữ xuống dòng,
              *  kết quả là những "quả bầu dục" cao nghẹt như trong ảnh lỗi.
              * ================================================================ */}
          <div className="hidden lg:block pb-3">
            <div className="flex items-center gap-4">
              <form action="/tim-kiem" className="shrink-0 basis-[min(100%,440px)]">
                <div className="flex">
                  <input
                    name="q" value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder='Quận 9, Thủ Đức, Vinhomes… (gõ tên quận cũ vẫn ra)'
                    aria-label="Tìm kiếm bất động sản"
                    className={SEARCH_INPUT}
                  />
                  <button type="submit" aria-label="Tìm" className={`${SEARCH_BTN} px-6 gap-1.5`}>
                    <iconify-icon icon="lucide:search" /> Tìm
                  </button>
                </div>
              </form>

              <nav aria-label="Khu vực"
                   className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {units.map((d) => (
                  <Link
                    key={d.id}
                    href={`/quan/${d.slug}`}
                    className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full
                               text-[12.5px] font-semibold text-gold-100/90
                               hover:text-white hover:bg-white/15
                               transition-all duration-300"
                  >
                    {/* Bỏ tiền tố dài cho gọn, nhưng GIỮ "Quận" — bỏ cả nó
                        sẽ còn lại "1", "3" và người dùng không biết
                        đó là quận nào. */}
                    {d.name_new.replace(/^(Thành phố|Huyện|Thị xá)\s+/, '')}
                  </Link>
                ))}
                {units.length === 0 && (
                  <span className="text-[12.5px] text-white/50">Đang tải khu vực…</span>
                )}
              </nav>
            </div>
          </div>

          {/* Màn hình vừa: chỉ ô tìm kiếm, không xếp chồng quá nhiều hàng */}
          <div className="hidden md:block lg:hidden pb-3">
            <form action="/tim-kiem">
              <div className="flex">
                <input
                  name="q" value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder='Tìm quận, phường, dự án…'
                  aria-label="Tìm kiếm bất động sản"
                  className={SEARCH_INPUT}
                />
                <button type="submit" aria-label="Tìm" className={`${SEARCH_BTN} px-5`}>
                  <iconify-icon icon="lucide:search" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* ============================================================= menu mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 top-[68px] z-40 bg-liquid overflow-y-auto">
          <div aria-hidden className="absolute inset-0 bg-grid" />
          <div className="relative px-4 py-5">
            <form action="/tim-kiem" className="mb-5 flex">
              <input name="q" placeholder="Tìm quận, phường, dự án…"
                     className="flex-1 min-w-0 h-11 px-4 rounded-l-full bg-white/[0.12]
                                border border-white/20 text-white placeholder:text-white/60
                                focus:bg-white/[0.2] focus:ring-2 focus:ring-gold-400/50
                                focus:outline-none transition-all" />
              <button type="submit" aria-label="Tìm"
                      className="shrink-0 h-11 px-5 rounded-r-full bg-grad-flame">
                <iconify-icon icon="lucide:search" />
              </button>
            </form>

            <nav className="grid grid-cols-2 gap-2 mb-4">
              {[...NAV, { href: '/tim-kiem', label: 'Tìm kiếm' }].map((n) => (
                <Link key={n.href} href={n.href}
                      className="px-4 py-3 rounded-2xl glass-dark text-white font-semibold
                                 text-[14px] hover:bg-white/20 transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="flex gap-2 mb-6 sm:hidden">
              <Link href="/dang-nhap"
                    className="flex-1 text-center py-3 rounded-full glass-dark
                               text-white font-bold text-sm">
                Đăng Nhập
              </Link>
              <Link href="/dang-tin"
                    className="flex-1 text-center py-3 rounded-full bg-grad-gold
                               text-flame-900 font-extrabold text-sm shadow-glow">
                Đăng Ký
              </Link>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-gold-300 mb-2.5">
              Khu vực
            </p>
            <div className="flex flex-wrap gap-2">
              {units.map((d) => (
                <Link key={d.id} href={`/quan/${d.slug}`}
                      className="px-3.5 py-1.5 rounded-full bg-white/10 text-white
                                 text-[12.5px] font-semibold hover:bg-white/20
                                 transition-colors duration-300">
                  {d.name_new}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- băng đang lọc */}
      {activeSearch && (
        <div className="relative z-30 bg-gradient-to-r from-gold-100 via-amber-50 to-flame-50
                        border-b border-gold-200 px-4 py-2">
          <div className="mx-auto max-w-7xl flex items-center gap-2 text-[12.5px] text-coal-700">
            <iconify-icon icon="lucide:filter" className="text-flame-600" />
            <span>Đang lọc theo: <b>{activeSearch}</b></span>
            <Link href="/tim-kiem"
                  className="ml-auto font-bold text-flame-700 underline hover:no-underline">
              Xoá bộ lọc
            </Link>
          </div>
        </div>
      )}
    </>
  );
}