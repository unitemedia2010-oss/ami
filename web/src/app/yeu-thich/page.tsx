'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, type ListingCard as C, fmtPrice } from '@/lib/api';
import { coverImage } from '@/lib/cover';
import { getWatchlist, type WatchItem } from '@/components/ListingCard';
import { SectionHeader, Note } from '@/components/ui';

export default function WatchlistPage() {
  const [saved, setSaved] = useState<WatchItem[]>([]);
  const [items, setItems] = useState<C[]>([]);
  const [loading, setLoading] = useState(true);

  // nạp lại khi có thay đổi (bấm tim ở trang khác, hoặc xoá tại đây)
  useEffect(() => {
    const load = () => {
      const list = getWatchlist();
      setSaved(list);
      if (list.length === 0) { setItems([]); setLoading(false); return; }

      setLoading(true);
      Promise.all(
        list.map((w) =>
          // w.d là slug quận do lúc bấm nút yêu thích đã lưu kèm. Tin lưu
          // từ phiên cũ (trước khi có dữ liệu chia theo quận) sẽ không có
          // w.d — bỏ qua thay vì báo lỗi.
          w.d
            ? api.detail(w.slug, w.d)
                .then((r) => r.data)
                .catch(() => null)
            : Promise.resolve(null),
        ),
      )
        // tin đã bị gỡ hoặc hết hạn → bỏ khỏi danh sách, đừng hiển thị ô rỗng
        .then((res) => {
          const ok = res.filter(Boolean) as C[];
          setItems(ok);
          const alive = new Set(ok.map((x) => x.id));
          const stale = list.filter((w) => !alive.has(w.id));
          if (stale.length) {
            localStorage.setItem(
              'sgrealty:watchlist',
              JSON.stringify(list.filter((w) => alive.has(w.id))),
            );
            setSaved(list.filter((w) => alive.has(w.id)));
          }
        })
        .finally(() => setLoading(false));
    };

    load();
    window.addEventListener('sgrealty:watchlist', load);
    return () => window.removeEventListener('sgrealty:watchlist', load);
  }, []);

  const remove = useCallback((id: string) => {
    const list = getWatchlist().filter((x) => x.id !== id);
    localStorage.setItem('sgrealty:watchlist', JSON.stringify(list));
    setItems((prev) => prev.filter((x) => x.id !== id));
    setSaved(list);
    window.dispatchEvent(new Event('sgrealty:watchlist'));
  }, []);

  const clearAll = () => {
    if (!confirm('Xoá toàn bộ danh sách yêu thích?')) return;
    localStorage.removeItem('sgrealty:watchlist');
    setItems([]);
    setSaved([]);
    window.dispatchEvent(new Event('sgrealty:watchlist'));
  };

  const compare = () => {
    /* "slug|quận" — xem giải thích ở đầu trang /so-sanh */
    const slugs = items.map((l) => `${l.slug}|${l.district_slug ?? ''}`);
    if (slugs.length >= 2) {
      location.href = `/so-sanh?ids=${encodeURIComponent(slugs.join(','))}`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <SectionHeader
        title="Danh sách yêu thích"
        sub={
          saved.length
            ? `${saved.length} tin đã lưu trên thiết bị này`
            : 'Lưu tin bạn thích để xem lại sau'
        }
        href="/tim-kiem"
        hrefLabel="Tìm thêm tin"
      />

      {loading ? (
        <div className="listing-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton h-48 rounded-none" />
              <div className="p-4 space-y-2.5">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <>
          <Note tone="info" title="Chưa có tin yêu thích nào">
            Bấm biểu tượng <b>trái tim</b> trên góc phải mỗi thẻ tin để lưu lại.
            Danh sách được giữ trên trình duyệt này — xoá dữ liệu trình duyệt là mất.
          </Note>

          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-flame-50 text-flame-300
                            grid place-items-center mx-auto mb-5">
              <iconify-icon icon="lucide:heart" className="text-4xl" />
            </div>
            <h2 className="text-lg font-bold mb-2">Bắt đầu sưu tậm tin bạn thích</h2>
            <p className="text-coal-500 text-sm mb-6">
              Lọc theo khu vực, mức giá hoặc số phòng ngủ để tìm nhanh hơn.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/tim-kiem" className="btn-primary">
                <iconify-icon icon="lucide:search" /> Bắt đầu tìm kiếm
              </Link>
              <Link href="/du-an" className="btn-outline">
                <iconify-icon icon="lucide:building-2" /> Xem dự án
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ------------------------------------------------- thanh thao tác */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              onClick={compare}
              disabled={items.length < 2}
              className="btn-primary disabled:opacity-40"
            >
              <iconify-icon icon="lucide:columns-3" /> So sánh ({items.length})
            </button>
            <button onClick={clearAll} className="btn-outline text-red-600 border-red-200 hover:bg-red-50">
              <iconify-icon icon="lucide:trash-2" /> Xoá tất cả
            </button>
          </div>

          <div className="listing-grid">
            {items.map((l) => (
              <div key={l.id} className="card group relative">
                <Link href={`/chi-tiet?d=${l.district_slug ?? ''}&slug=${encodeURIComponent(l.slug)}`}>
                  <div className="relative h-48 bg-cream-200 overflow-hidden">
                    {l.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.images[0]} alt={l.title} loading="lazy"
                           className="w-full h-full object-cover transition-transform
                                      duration-500 group-hover:scale-105" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverImage(l.project_name || l.title, l.project_hue ?? 18, 0)}
                           alt={l.title} loading="lazy"
                           className="w-full h-full object-cover transition-transform
                                      duration-500 group-hover:scale-105" />
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full
                                     text-[10px] font-bold uppercase tracking-wide
                                     bg-amber-500 text-white shadow-sm">
                      {l.type === 'rent' ? 'Cho thuê' : 'Bán'}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-[15px] clamp-2 group-hover:text-flame-600
                                   transition-colors">{l.title}</h3>
                    <p className="text-xs text-coal-500 truncate">
                      <iconify-icon icon="lucide:map-pin" className="mr-1" />
                      {[l.project_name, l.ward_name || l.district_name].filter(Boolean).join(' · ')}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-cream-100">
                      <span className="text-flame-600 font-bold text-[15px]">
                        {fmtPrice(l.price, l.price_unit, l.type)}
                      </span>
                      <span className="text-xs font-bold text-coal-400 group-hover:text-flame-600
                                       transition-colors">Chi tiết</span>
                    </div>
                  </div>
                </Link>

                <button
                  onClick={() => remove(l.id)}
                  aria-label={`Bỏ ${l.title} khỏi yêu thích`}
                  className="absolute top-3 right-3 btn-icon bg-white/80 backdrop-blur
                             shadow-sm text-amber-500 hover:bg-white"
                >
                  <iconify-icon icon="lucide:heart-fill" className="text-xl" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}