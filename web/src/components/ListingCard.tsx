'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ListingCard as C, fmtPrice, fmtArea, timeAgo } from '@/lib/api';
import { coverImage } from '@/lib/cover';

/* =============================================================================
 *  Danh sách yêu thích — lưu trong localStorage, KHÔNG cần đăng nhập.
 *  Lưu cả `id` và `slug`:
 *    • slug để tải lại dữ liệu khi mở trang /yeu-thich
 *    • id   để dùng chung với trang /so-sanh
 *  Giới hạn: chỉ trên thiết bị này, mất khi xoá dữ liệu trình duyệt.
 * ========================================================================== */
const KEY = 'sgrealty:watchlist';

export interface WatchItem {
  id: string;
  slug: string;
  title: string;
  /** slug quận — cần để tải đúng file dữ liệu khi mở lại trang /yeu-thich */
  d?: string;
  addedAt?: number;
}

function read(): WatchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function toggleWatch(item: WatchItem): boolean {
  const list = read();
  const exists = list.some((x) => x.id === item.id);
  const next = exists ? list.filter((x) => x.id !== item.id) : [{ ...item, addedAt: Date.now() }, ...list];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('sgrealty:watchlist'));
  return !exists;
}

export function getWatchlist(): WatchItem[] {
  return read();
}

export function WatchButton({
  id, slug, title, district, className = '',
}: { id: string; slug: string; title: string; district?: string | null; className?: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(read().some((x) => x.id === id)); }, [id]);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
      onClick={(e) => {
        e.preventDefault();          // tránh bấm nhầm làm mở trang chi tiết
        e.stopPropagation();
        setOn(toggleWatch({ id, slug, title, d: district ?? undefined }));
      }}
      className={`btn-icon backdrop-blur ${className} ${
        on
          ? 'bg-grad-flame text-white shadow-glow'
          : 'bg-white/80 text-coal-400 hover:text-flame-600 hover:bg-white'
      }`}
    >
      <iconify-icon icon={on ? 'lucide:heart-fill' : 'lucide:heart'} className="text-lg" />
    </button>
  );
}

/* =============================================================================
 *  Card bất động sản
 * ========================================================================== */
export default function ListingCard({ l }: { l: C }) {
  /* Ảnh thật nếu có; không thì tự vẽ SVG từ hue của dự án.
     Nhờ vậy bản deploy tĩnh không cần nhúng ảnh nào mà vẫn có hình đầy đủ.
     ⚠ Chỉ vẽ ẢNH ĐANG HIỆN — mỗi SVG ~5 KB, dựng sẵn cả 3 bản cho 24 card
       là 360 KB vô ích. */
  const real = l.images?.length;
  const img = real
    ? l.images![0]
    : coverImage(l.project_name || l.title, l.project_hue ?? 18, 0);
  const photoCount = real || 3;   // bản tĩnh luôn coi như có 3 góc nhìn

  const specs: [string, string][] = [];
  if (l.area != null) specs.push(['lucide:move-diagonal', fmtArea(l.area)]);
  if (l.bedrooms != null) specs.push(['lucide:bed-double', `${l.bedrooms}PN`]);
  if (l.floor_number != null) specs.push(['lucide:layers', `T${l.floor_number}`]);

  return (
    <Link
      href={`/chi-tiet?d=${l.district_slug ?? ''}&slug=${encodeURIComponent(l.slug)}`}
      className="card block group"
    >
      {/* ----------------------------------------------------------------- ảnh */}
      <div className="relative h-48 bg-cream-200 overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={l.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-coal-300
                          bg-gradient-to-br from-gold-200 via-amber-200 to-flame-200">
            <iconify-icon icon="lucide:building-2" className="text-5xl" />
          </div>
        )}

        {/* phủ gradient ở chân ảnh để chữ đọc tốt khi hover */}
        <div aria-hidden
             className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

        <WatchButton id={l.id} slug={l.slug} title={l.title} district={l.district_slug}
                       className="absolute top-3 right-3" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {l.is_sponsored && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase
                             tracking-wide bg-grad-flame text-white shadow-glow
                             inline-flex items-center gap-1">
              <iconify-icon icon="lucide:flame" className="text-[11px]" /> Nổi bật
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase
                           tracking-wide text-white shadow-sm inline-flex items-center gap-1
                           backdrop-blur ${
                             l.type === 'rent'
                               ? 'bg-coal-800/80'
                               : 'bg-gradient-to-r from-gold-500 to-amber-600'
                           }`}>
            {l.type === 'rent' ? 'Cho thuê' : 'Bán'}
          </span>
        </div>

        {photoCount > 1 && (
          <span className="absolute bottom-3 right-3 px-2 py-1 rounded-full
                           bg-black/55 backdrop-blur text-white text-[10px] font-bold
                           inline-flex items-center gap-1">
            <iconify-icon icon="lucide:images" /> {photoCount}
          </span>
        )}
      </div>

      {/* -------------------------------------------------------------- nội dung */}
      <div className="p-4 flex-grow space-y-2">
        <h3 className="font-bold text-[15px] text-coal-900 leading-snug clamp-2
                       group-hover:text-flame-700 transition-colors duration-300">
          {l.title}
        </h3>

        <p className="text-[11.5px] text-coal-500 flex items-center gap-1 truncate">
          <iconify-icon icon="lucide:map-pin" className="shrink-0 text-amber-500" />
          {[l.project_name, l.ward_name || l.district_name].filter(Boolean).join(' · ') || '—'}
        </p>

        {specs.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-coal-500">
            {specs.map(([ic, t]) => (
              <span key={ic} className="flex items-center gap-1">
                <iconify-icon icon={ic} className="text-amber-500" /> {t}
              </span>
            ))}
          </div>
        )}

        {/* --------------------------------------------------------------- giá */}
        <div className="flex items-end justify-between gap-2 pt-2.5 border-t border-cream-200">
          <span className="text-[17px] font-extrabold grad-text leading-none">
            {fmtPrice(l.price, l.price_unit, l.type)}
          </span>
          <span className="text-[10.5px] text-coal-400 shrink-0">
            {timeAgo(l.published_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* =============================================================================
 *  Card dự án
 * ========================================================================== */
export interface Project {
  id: string;
  name: string;
  address?: string | null;
  hero_image?: string | null;
  building_count?: number | null;
  apartment_count?: number | null;
  slug?: string;
  /** số màu 0–360 để vẽ ảnh bìa khi không có ảnh thật */
  hue?: number | null;
}

export function ProjectCard({ p }: { p: Project }) {
  const img = p.hero_image || coverImage(p.name, p.hue ?? 18, 0);

  return (
    <Link href={`/tim-kiem/?project=${p.id}`} className="card block group">
      <div className="relative h-48 bg-cream-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700
                     group-hover:scale-110"
        />
        <div aria-hidden
             className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px]
                         font-extrabold uppercase tracking-wide glass-dark text-white">
          Dự án
        </span>
      </div>

      <div className="p-4 flex-grow space-y-2">
        <h3 className="font-bold truncate text-[15px] text-coal-900
                       group-hover:text-flame-700 transition-colors duration-300">
          {p.name}
        </h3>
        {p.address && (
          <p className="text-[11.5px] text-coal-500 clamp-2 flex items-start gap-1">
            <iconify-icon icon="lucide:map-pin" className="shrink-0 mt-0.5 text-amber-500" />
            {p.address}
          </p>
        )}

        <div className="flex items-center justify-between pt-2.5 border-t border-cream-200">
          <span className="text-[13px] font-extrabold grad-text">
            {p.building_count ? `${p.building_count} toà` : 'Xem tin'}
          </span>
          <span className="text-[11px] font-bold text-coal-400 group-hover:text-flame-700
                           transition-colors duration-300 inline-flex items-center gap-1">
            Chi tiết <iconify-icon icon="lucide:arrow-right" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton h-48 rounded-none" />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    </div>
  );
}