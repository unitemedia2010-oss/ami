'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  api, type ListingCard as C, type ListingPage, type Filters,
  type AdminUnit, type AdminWard,
} from '@/lib/api';
import ListingCard, { ListingCardSkeleton } from '@/components/ListingCard';
import Pagination from '@/components/Pagination';
import { Note } from '@/components/ui';

const SORTS: [NonNullable<Filters['sort']>, string][] = [
  ['newest', 'Mới nhất'],
  ['price_asc', 'Giá thấp → cao'],
  ['price_desc', 'Giá cao → thấp'],
  ['popular', 'Xem nhiều nhất'],
];

const SELL_BANDS: [string, number, number][] = [
  ['Dưới 1 tỷ', 0, 1000],
  ['1 – 2 tỷ', 1000, 2000],
  ['2 – 3 tỷ', 2000, 3000],
  ['3 – 5 tỷ', 3000, 5000],
  ['5 – 7 tỷ', 5000, 7000],
  ['Trên 7 tỷ', 7000, 0],
];

const RENT_BANDS: [string, number, number][] = [
  ['Dưới 5 triệu', 0, 5],
  ['5 – 10 triệu', 5, 10],
  ['10 – 15 triệu', 10, 15],
  ['15 – 20 triệu', 15, 20],
  ['20 – 30 triệu', 20, 30],
  ['Trên 30 triệu', 30, 0],
];

function SearchPageInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const [f, setF] = useState<Filters>(() => ({
    type: (sp.get('type') as Filters['type']) || undefined,
    district: sp.get('district') ? Number(sp.get('district')) : undefined,
    ward: sp.get('ward') ? Number(sp.get('ward')) : undefined,
    q: sp.get('q') || undefined,
    min: sp.get('min') ? Number(sp.get('min')) : undefined,
    max: sp.get('max') ? Number(sp.get('max')) : undefined,
    bedrooms: sp.get('bedrooms') ? Number(sp.get('bedrooms')) : undefined,
    sort: (sp.get('sort') as Filters['sort']) || 'newest',
    page: Number(sp.get('page')) || 1,
    per_page: 24,
  }));

  const [data, setData] = useState<ListingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [units, setUnits] = useState<{ districts: AdminUnit[]; wards: AdminWard[] }>({
    districts: [], wards: [],
  });
  const [mobileFilters, setMobileFilters] = useState(false);
  const [kw, setKw] = useState(f.q || '');
  const [hints, setHints] = useState<any[]>([]);

  useEffect(() => {
    api.adminUnits().then(setUnits).catch(() => {});
  }, []);

  // ------------------------------------------------------------- tải danh sách
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.listings(f)
      .then((r) => { if (alive) { setData(r); setErr(''); } })
      .catch((e) => { if (alive) setErr(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [f]);

  // ---------------------------- gợi ý tên quận CŨ (điểm khác biệt của sản phẩm)
  useEffect(() => {
    if (kw.trim().length < 2) { setHints([]); return; }
    const t = setTimeout(() => {
      api.searchUnits(kw.trim())
        .then((r) => setHints(r.data || []))
        .catch(() => setHints([]));
    }, 250);
    return () => clearTimeout(t);
  }, [kw]);

  // ------------------------------- đồng bộ URL để người dùng copy/chia sẻ được
  useEffect(() => {
    const q = new URLSearchParams();
    if (f.type) q.set('type', f.type);
    if (f.district) q.set('district', String(f.district));
    if (f.ward) q.set('ward', String(f.ward));
    if (f.q) q.set('q', f.q);
    if (f.min != null) q.set('min', String(f.min));
    if (f.max != null) q.set('max', String(f.max));
    if (f.bedrooms) q.set('bedrooms', String(f.bedrooms));
    if (f.sort && f.sort !== 'newest') q.set('sort', f.sort);
    if (f.page && f.page > 1) q.set('page', String(f.page));
    const s = q.toString();
    if (s !== sp.toString()) {
      router.replace(`/tim-kiem${s ? `?${s}` : ''}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const wards = useMemo(
    () => units.wards.filter((w) => w.district_id === f.district),
    [units, f.district],
  );

  const set = (patch: Partial<Filters>) => setF((p) => ({ ...p, ...patch, page: 1 }));
  const reset = () => setF({ type: f.type, sort: 'newest', page: 1, per_page: 24 });

  const activeCount =
    (f.district ? 1 : 0) + (f.ward ? 1 : 0) +
    (f.min != null || f.max != null ? 1 : 0) + (f.bedrooms ? 1 : 0);

  const bands = f.type === 'rent' ? RENT_BANDS : SELL_BANDS;

  // ============================================================== bộ lọc
  const FilterPanel = (
    <div className="space-y-7">
      <div>
        <h3 className="label-xs mb-3">Loại tin</h3>
        <div className="grid grid-cols-2 gap-2">
          {([['sell', 'Mua bán'], ['rent', 'Cho thuê']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => set({ type: f.type === v ? undefined : v })}
              className={`h-11 rounded-xl text-sm font-bold transition-colors duration-200 ${
                f.type === v
                  ? 'bg-amber-500 text-white shadow-card'
                  : 'bg-white text-coal-700 border border-cream-200 hover:border-flame-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="label-xs mb-3">Khu vực</h3>
        <select
          aria-label="Chọn quận hoặc huyện"
          className="field"
          value={f.district ?? ''}
          onChange={(e) => set({
            district: e.target.value ? Number(e.target.value) : undefined,
            ward: undefined,
          })}
        >
          <option value="">Tất cả quận/huyện</option>
          {units.districts.map((d) => <option key={d.id} value={d.id}>{d.name_new}</option>)}
        </select>

        {f.district && wards.length > 0 && (
          <select
            aria-label="Chọn phường hoặc xã"
            className="field mt-2"
            value={f.ward ?? ''}
            onChange={(e) => set({ ward: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Tất cả phường/xã</option>
            {wards.map((w) => <option key={w.id} value={w.id}>{w.name_new}</option>)}
          </select>
        )}
      </div>

      <div>
        <h3 className="label-xs mb-3">
          Khoảng giá {f.type === 'rent' ? '(triệu/tháng)' : ''}
        </h3>
        <div className="space-y-1">
          {bands.map(([label, lo, hi]) => (
            <label
              key={label}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer
                          text-[13px] transition-colors duration-200 ${
                            f.min === lo && f.max === (hi || undefined)
                              ? 'bg-flame-50 text-flame-600 font-semibold'
                              : 'text-coal-700 hover:bg-cream-100'
                          }`}
            >
              <input
                type="radio"
                name="price"
                checked={f.min === lo && f.max === (hi || undefined)}
                onChange={() => set({ min: lo || undefined, max: hi || undefined })}
                className="accent-flame-600-600"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="label-xs mb-3">Số phòng ngủ</h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => set({ bedrooms: f.bedrooms === n ? undefined : n })}
              className={`flex-1 h-11 rounded-xl text-[13px] font-bold transition-colors duration-200 ${
                f.bedrooms === n
                  ? 'bg-flame-600 text-white shadow-card'
                  : 'bg-white text-coal-700 border border-cream-200 hover:border-flame-400'
              }`}
            >
              {n === 5 ? '5+' : n}
            </button>
          ))}
        </div>
      </div>

      {activeCount > 0 && (
        <button onClick={reset}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold text-red-600
                           border border-red-200 hover:bg-red-50 transition-colors">
          <iconify-icon icon="lucide:rotate-ccw" className="mr-1" />
          Xoá bộ lọc ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <h1 className="h1">
        {f.type === 'rent' ? 'Cho thuê' : 'Mua bán'} bất động sản TP.HCM
      </h1>
      <p className="text-coal-500 text-sm mt-2 mb-6">
        {loading && !data ? (
          'Đang tải…'
        ) : (
          <>Có <b className="text-flame-600">{data?.total.toLocaleString('vi-VN') ?? 0}</b> tin phù hợp</>
        )}
      </p>

      {/* ------------------------------------------------------------ ô tìm kiếm */}
      <div className="relative mb-6">
        <div className="flex">
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') set({ q: kw.trim() || undefined }); }}
            placeholder='Nhập tên quận, phường hoặc dự án — gõ “quận 9”, “quận Thủ Đức” đều ra kết quả'
            aria-label="Tìm kiếm"
            className="field flex-1 h-14 rounded-r-none"
          />
          <button
            onClick={() => set({ q: kw.trim() || undefined })}
            className="h-14 px-8 rounded-r-xl bg-amber-500 text-white font-bold
                       hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <iconify-icon icon="lucide:search" />
            <span className="hidden sm:inline">Tìm</span>
          </button>
        </div>

        {hints.length > 0 && (
          <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white rounded-2xl
                          shadow-lg border border-cream-200 overflow-hidden">
            {hints.map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  set({ q: h.name });
                  if (h.kind === 'district') setF((p) => ({ ...p, district: h.id, ward: undefined }));
                  else setF((p) => ({ ...p, ward: h.id }));
                  setKw(h.name);
                  setHints([]);
                }}
                className="w-full text-left px-4 py-3 hover:bg-flame-50 flex items-center gap-3
                           transition-colors"
              >
                <span className={`chip shrink-0 ${h.kind === 'district' ? 'chip-active' : ''}`}>
                  {h.kind === 'district' ? 'Quận/Huyện' : 'Phường/Xã'}
                </span>
                <span className="text-[14px] font-semibold text-coal-800">{h.name}</span>
                <iconify-icon icon="lucide:corner-down-left" className="ml-auto text-cream-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------- thanh sắp xếp */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setMobileFilters(!mobileFilters)}
          className="btn-outline btn-sm lg:hidden"
        >
          <iconify-icon icon="lucide:sliders-horizontal" />
          Bộ lọc {activeCount > 0 && `(${activeCount})`}
        </button>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar ml-auto">
          {SORTS.map(([v, label]) => (
            <button
              key={v}
              onClick={() => set({ sort: v })}
              className={`shrink-0 px-4 py-2 rounded-xl text-[12.5px] font-bold
                          transition-colors duration-200 ${
                            f.sort === v
                              ? 'bg-flame-600 text-white shadow-card'
                              : 'bg-white text-coal-600 border border-cream-200 hover:border-flame-300'
                          }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <aside className={mobileFilters ? 'block' : 'hidden lg:block'}>
          <div className="section-card lg:sticky lg:top-32">{FilterPanel}</div>
        </aside>

        <section>
          {err && (
            <div className="mb-6">
              <Note tone="danger" title="Không tải được danh sách tin">
                {err}
                <button onClick={() => setF({ ...f })} className="block mt-2 underline">
                  Thử lại
                </button>
              </Note>
            </div>
          )}

          {loading ? (
            <div className="listing-grid">
              {Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : data && data.data.length > 0 ? (
            <>
              <div className="listing-grid">
                {data.data.map((l: C) => <ListingCard key={l.id} l={l} />)}
              </div>
              <Pagination page={data.page} total={data.total} perPage={data.per_page} />
            </>
          ) : (
            <div className="section-card text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-flame-50 text-flame-300
                              grid place-items-center mx-auto mb-4">
                <iconify-icon icon="lucide:search-x" className="text-3xl" />
              </div>
              <p className="font-bold mb-1">Không tìm thấy tin phù hợp</p>
              <p className="text-coal-500 text-sm mb-6">
                Thử bỏ bớt bộ lọc hoặc tìm bằng từ khoá khác.
              </p>
              <button onClick={reset} className="btn-outline">Xoá bộ lọc</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-10 text-coal-400">Đang tải…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}