'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type ListingCard as C, fmtPrice, fmtArea } from '@/lib/api';
import { coverImage } from '@/lib/cover';
import { WatchButton } from '@/components/ListingCard';
import { Note, SectionHeader, BarChart } from '@/components/ui';

const MAX = 4;

function CompareInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const ids = (sp.get('ids') || '').split(',').filter(Boolean).slice(0, MAX);
  const [items, setItems] = useState<C[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ids.length === 0) { setItems([]); return; }
    setLoading(true);
    Promise.all(
      ids.map((slug) => api.detail(decodeURIComponent(slug)).then((r) => r.data).catch(() => null)),
    )
      .then((list) => setItems(list.filter(Boolean) as C[]))
      .finally(() => setLoading(false));
  }, [sp.toString()]);

  const remove = (slug: string) => {
    const next = ids.filter((s) => s !== slug);
    router.push(next.length ? `/so-sanh?ids=${encodeURIComponent(next.join(','))}` : '/so-sanh');
  };

  // --------------------------------------------------------------- hàng so sánh
  const ROWS: { label: string; get: (l: C) => React.ReactNode }[] = [
    { label: 'Giá', get: (l) => (
        <span className="text-flame-600 font-bold text-base">
          {fmtPrice(l.price, l.price_unit, l.type)}
        </span>
      ) },
    { label: 'Diện tích', get: (l) => fmtArea(l.area) },
    { label: 'Phòng ngủ', get: (l) => (l.bedrooms != null ? `${l.bedrooms} phòng` : '—') },
    { label: 'Phòng tắm', get: (l) => (l.bathrooms != null ? `${l.bathrooms} phòng` : '—') },
    { label: 'Tầng', get: (l) => (l.floor_number != null ? `Tầng ${l.floor_number}` : '—') },
    { label: 'Hướng', get: (l) => l.direction || '—' },
    { label: 'Nội thất', get: (l) => l.furniture || '—' },
    { label: 'Dự án', get: (l) => l.project_name || '—' },
    { label: 'Phường/Xã', get: (l) => l.ward_name || '—' },
    { label: 'Quận/Huyện', get: (l) => l.district_name || '—' },
    { label: 'Giá / m²', get: (l) =>
      l.area ? `${Math.round((l.price * 1_000_000) / l.area).toLocaleString('vi-VN')} đ` : '—' },
  ];

  const prices = items.map((l) => l.price);
  const areas = items.map((l) => l.area || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <SectionHeader
        title="So sánh bất động sản"
        sub="Tối đa 4 tin cùng lúc — nhìn ra điểm khác biệt nhanh chóng"
      />

      {ids.length === 0 ? (
        <>
          <Note tone="info" title="Chưa chọn tin nào để so sánh">
            Bấm biểu tượng <b>trái tim</b> trên thẻ tin, hoặc dùng nút “So sánh” bên dưới
            mỗi tin, rồi quay lại trang này.
          </Note>

          <div className="mt-8">
            <h2 className="text-lg font-bold mb-4">Gợi ý bắt đầu</h2>
            <ComparePicks />
          </div>
        </>
      ) : (
        <>
          {/* ------------------------------------------------ bảng so sánh */}
          {loading ? (
            <div className="py-20 text-center text-coal-400">Đang tải…</div>
          ) : (
            <div className="bg-white rounded-2xl shadow-card border border-cream-200
                            overflow-x-auto mb-10">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-cream-200">
                    <th className="w-36 p-4 text-left label-xs sticky left-0 bg-white">Tiêu chí</th>
                    {items.map((l) => (
                      <th key={l.id} className="p-4 text-left align-top min-w-[180px]">
                        <div className="relative">
                          <WatchButton
                            id={l.id}
                            slug={l.slug}
                            title={l.title}
                            className="absolute top-0 right-0 !bg-cream-200 hover:!bg-cream-200"
                          />
                          <Link href={`/chi-tiet?slug=${encodeURIComponent(l.slug)}`}
                                className="block pr-9">
                            {l.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.images[0]} alt=""
                                   className="w-full h-24 object-cover rounded-xl mb-2" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={coverImage(l.project_name || l.title, l.project_hue ?? 18, 0)}
                                   alt="" loading="lazy"
                                   className="w-full h-24 object-cover rounded-xl mb-2" />
                            )}
                            <span className="text-[13px] font-bold clamp-2 hover:text-flame-600
                                             transition-colors">
                              {l.title}
                            </span>
                          </Link>
                          <button
                            onClick={() => remove(l.slug)}
                            className="mt-2 text-[11px] text-red-600 hover:underline
                                       flex items-center gap-1"
                          >
                            <iconify-icon icon="lucide:trash-2" /> Bỏ khỏi so sánh
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, ri) => {
                    const nums = row.label === 'Giá' ? prices
                      : row.label === 'Diện tích' ? areas
                      : [];
                    const best = nums.length > 1 ? Math.min(...nums) : null;

                    return (
                      <tr key={row.label}
                          className={ri % 2 ? 'bg-cream-100/50' : ''}>
                        <td className="p-4 font-bold text-coal-600 text-[13px]
                                       sticky left-0 bg-inherit">{row.label}</td>
                        {items.map((l, i) => {
                          const isBest = best != null && nums[i] === best && nums.length > 1;
                          return (
                            <td key={l.id}
                                className={`p-4 text-[13px] ${isBest
                                  ? 'text-green-700 font-bold'
                                  : 'text-coal-700'}`}>
                              {row.get(l)}
                              {isBest && (
                                <iconify-icon icon="lucide:check"
                                              className="ml-1 text-green-600" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* --------------------------------------------------- biểu đồ giá */}
          {items.length > 1 && (
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="section-card">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                  <iconify-icon icon="lucide:banknote" className="text-flame-600 text-xl" />
                  So sánh mức giá
                </h2>
                <BarChart
                  data={items.map((l) => ({
                    label: l.title.slice(0, 26),
                    value: l.price,
                    sub: `${fmtPrice(l.price, l.price_unit, l.type)} · ${
                      l.area ? `${Math.round((l.price * 1e6) / l.area).toLocaleString('vi-VN')} đ/m²` : ''
                    }`,
                  }))}
                  suffix=" triệu"
                />
              </div>

              <div className="section-card">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                  <iconify-icon icon="lucide:move-diagonal" className="text-flame-600 text-xl" />
                  So sánh diện tích
                </h2>
                <BarChart
                  data={items.map((l) => ({
                    label: l.title.slice(0, 26),
                    value: l.area || 0,
                    sub: l.bedrooms != null ? `${l.bedrooms} phòng ngủ` : '',
                  }))}
                  suffix=" m²"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/tim-kiem" className="btn-outline">
              <iconify-icon icon="lucide:arrow-left" /> Tìm thêm tin
            </Link>
            <Link href="/yeu-thich" className="btn-primary">
              <iconify-icon icon="lucide:heart" /> Xem yêu thích
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================ gợi ý để so sánh */
function ComparePicks() {
  const [list, setList] = useState<C[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    api.listings({ sort: 'popular', per_page: 8 })
      .then((r) => setList(r.data))
      .catch(() => setList([]));
  }, []);

  const toggle = (slug: string) => {
    const next = picked.includes(slug)
      ? picked.filter((x) => x !== slug)
      : [...picked, slug].slice(0, MAX);
    setPicked(next);
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {list.slice(0, 8).map((l) => (
          <div key={l.id} className="card">
            <div className="relative h-32 bg-cream-200">
              {l.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.images[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImage(l.project_name || l.title, l.project_hue ?? 18, 0)} alt=""
                     loading="lazy" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-3">
              <p className="text-[12px] font-semibold clamp-2 mb-2 h-8">{l.title}</p>
              <p className="text-flame-600 font-bold text-sm mb-2">
                {fmtPrice(l.price, l.price_unit, l.type)}
              </p>
              <button
                onClick={() => toggle(l.slug)}
                disabled={!picked.includes(l.slug) && picked.length >= MAX}
                className={`w-full py-1.5 rounded-lg text-[12px] font-bold transition-colors ${
                  picked.includes(l.slug)
                    ? 'bg-amber-500 text-white'
                    : 'bg-flame-50 text-flame-600 hover:bg-flame-600 hover:text-white'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {picked.includes(l.slug) ? '✓ Đã chọn' : '+ So sánh'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        disabled={picked.length < 2}
        onClick={() => router.push(`/so-sanh?ids=${encodeURIComponent(picked.join(','))}`)}
        className="btn-primary btn-lg disabled:opacity-50"
      >
        So sánh {picked.length} tin <iconify-icon icon="lucide:arrow-right-circle" />
      </button>
    </>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-10 text-coal-400">Đang tải…</div>}>
      <CompareInner />
    </Suspense>
  );
}