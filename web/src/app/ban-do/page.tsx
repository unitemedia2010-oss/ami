'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { api, type AdminUnit, type MapProject } from '@/lib/api';
import MapView from '@/components/MapView';
import type { MapPoint } from '@/lib/map';
import { SectionHeader, Note } from '@/components/ui';
import { COMPARE_EVENT, getCompare } from '@/lib/compare';
import { u } from '@/lib/basePath';

/** Nghe giỏ so sánh để bản đồ đánh dấu lại theo — không cần reload trang. */
const CMP_EMPTY: ReturnType<typeof getCompare> = [];

function useCompare() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(COMPARE_EVENT, cb);
      return () => window.removeEventListener(COMPARE_EVENT, cb);
    },
    getCompare,
    () => CMP_EMPTY,       // hằng số — `() => []` sẽ gây render lặp
  );
}

export default function MapPage() {
  const [all, setAll] = useState<MapProject[]>([]);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [district, setDistrict] = useState('');
  const [q, setQ] = useState('');
  const [onlyWithListings, setOnlyWithListings] = useState(false);
  /** mặc định CHỈ hiện dự án đã định vị thật — marker tâm quận gây hiểu nhầm */
  const [onlyVerified, setOnlyVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [picked, setPicked] = useState<MapProject | null>(null);
  const compare = useCompare();

  useEffect(() => {
    api.adminUnits().then((r) => setUnits(r.districts)).catch(() => {});
    api.mapProjects()
      .then((r) => setAll(r.data || []))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Không tải được dữ liệu bản đồ'))
      .finally(() => setLoading(false));
  }, []);

  const soDaXacMinh = all.filter((p) => !p.approximate).length;

  /* Vị trí tâm quận — để đánh dấu tin đang so sánh. Tin đăng không có toạ độ
     riêng, chỉ biết thuộc quận nào, nên chấm sẽ nằm ở tâm quận.
     Khoá theo SLUG vì CompareItem.d lưu district_slug, không phải id. */
  const tamQuan = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; name: string }>();
    for (const u of units) {
      const lat = (u as unknown as { lat?: number }).lat;
      const lng = (u as unknown as { lng?: number }).lng;
      if (lat != null && lng != null) m.set(u.slug, { lat, lng, name: u.name_new });
    }
    return m;
  }, [units]);

  // lọc ở client cho tức thì, không gọi lại API mỗi lần gõ
  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return all.filter((p) => {
      if (onlyVerified && p.approximate) return false;
      if (onlyWithListings && p.listings === 0) return false;
      if (district && p.district_name !== units.find((d) => String(d.id) === district)?.name_new) {
        return false;
      }
      if (kw && !p.name.toLowerCase().includes(kw)
        && !(p.address || '').toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [all, q, district, onlyWithListings, onlyVerified, units]);

  const points: MapPoint[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    approximate: p.approximate,
    price: p.listings ? `${p.listings} tin đăng` : 'Chưa có tin',
    /* ⚠ Bắt buộc bọc u(). Link này nằm TRONG popup do Leaflet dựng bằng
       thẻ <a> phẳng — Next không gắn basePath cho nó, nên href thô sẽ
       nhảy ra ngoài thư mục /ami và gặp 404 "Site not found" trên
       GitHub Pages. Đã xảy ra thật: bấm "Xem tin →" trên bản đồ ra 404. */
    href: u(`/tim-kiem/?project=${p.id}`),
  }));

  /* Cham cac tin dang so sanh. Nhieu tin cung quan se chong len nhau nen
     day nhe theo thu tu de thay du so cham. */
  const cmpPoints: MapPoint[] = compare.flatMap((it, i) => {
    const t = tamQuan.get(it.d);
    if (!t) return [];
    return [{
      id: `cmp-${it.id}`,
      name: it.title,
      lat: t.lat + (i - 2) * 0.0016,
      lng: t.lng + (i % 2 ? 0.0016 : -0.0016),
      approximate: true,
      comparing: true,
      cmpIndex: i + 1,
      price: `${it.price.toLocaleString('vi-VN')} triệu`,
      href: u(`/chi-tiet?d=${it.d}&slug=${encodeURIComponent(it.slug)}`),
    }];
  });

  /* So sánh phải nổi lên trên: gộp chấm so sánh vào cùng danh sách. */
  const allPoints = [...cmpPoints, ...points];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader
        title="Bản đồ dự án bất động sản"
        sub="Xem các dự án chung cư theo vị trí trên bản đồ TP.HCM"
      />

      <div className="mb-5 space-y-2">
        {err && <Note tone="danger" title="Không tải được bản đồ">{err}</Note>}
        {!err && all.length > 0 && (
          <p className="text-[13px] text-coal-500">
            <b className="text-flame-700">{soDaXacMinh}</b> / {all.length} dự án đã được định vị
            đúng vị trí thật (đối chiếu OpenStreetMap). Phần còn lại mới đặt tạm ở
            tâm quận nên không hiện mặc định — bỏ chọn ô trên để xem.
          </p>
        )}
      </div>

      {/* -------------------------------------------------------------- lọc */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div>
          <label className="field-label" htmlFor="mp-q">Tìm dự án</label>
          <input id="mp-q" className="field" value={q}
                 onChange={(e) => setQ(e.target.value)}
                 placeholder="Vinhomes, The Prive…" />
        </div>

        <div>
          <label className="field-label" htmlFor="mp-d">Khu vực</label>
          <select id="mp-d" className="field" value={district}
                  onChange={(e) => setDistrict(e.target.value)}>
            <option value="">Tất cả quận/huyện</option>
            {units.map((d) => <option key={d.id} value={d.id}>{d.name_new}</option>)}
          </select>
        </div>

        <label className="flex items-end gap-2.5 pb-3 cursor-pointer select-none">
          <input type="checkbox" checked={onlyVerified}
                 onChange={(e) => setOnlyVerified(e.target.checked)}
                 className="w-4 h-4 accent-amber-500" />
          <span className="text-[13px] font-semibold text-coal-700">
            Chỉ hiện vị trí đã định vị
          </span>
        </label>

        <label className="flex items-end gap-2.5 pb-3 cursor-pointer select-none">
          <input type="checkbox" checked={onlyWithListings}
                 onChange={(e) => setOnlyWithListings(e.target.checked)}
                 className="w-4 h-4 accent-amber-500" />
          <span className="text-[13px] font-semibold text-coal-700">
            Chỉ hiện dự án đang có tin
          </span>
        </label>

        <div className="flex items-end pb-3">
          <p className="text-[13px] text-coal-500">
            <b className="text-flame-700">{rows.length}</b> dự án
            {cmpPoints.length > 0 && (
              <> · <b className="text-sky-600">{cmpPoints.length}</b> tin so sánh</>
            )}
          </p>
          {(q || district || onlyWithListings || !onlyVerified) && (
            <button
              onClick={() => { setQ(''); setDistrict(''); setOnlyWithListings(false); setOnlyVerified(true); }}
              className="ml-auto text-[12.5px] font-bold text-flame-600 hover:underline"
            >
              Xoá lọc
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- bản đồ */}
      {loading ? (
        <div className="h-[460px] rounded-2xl border border-cream-300 bg-white/70
                        grid place-items-center text-coal-400 text-sm">
          <iconify-icon icon="lucide:loader-2" className="text-3xl animate-spin" />
        </div>
      ) : (
        <>
          <MapView points={allPoints} onSelect={(p) => {
            /* Chấm so sánh không thuộc danh sách dự án nên không mở panel
               chi tiết dự án; bấm vào chỉ mở popup của Leaflet. */
            setPicked(rows.find((r) => r.id === p.id) ?? null);
          }} />

          {/* ------------------------------------------------------ chú giải */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]
                          text-coal-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-flame-500 ring-2 ring-white" />
              Dự án có vị trí thật
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-300 ring-2 ring-white" />
              Vị trí ước lượng theo quận
            </span>
            {cmpPoints.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400 ring-2 ring-white" />
                Tin đang so sánh — chấm đặt ở tâm quận
              </span>
            )}
          </div>
        </>
      )}

      {/* ------------------------------------------------- bảng tin đang so sánh */}
      {compare.length > 0 && (
        <section className="mt-8">
          <h2 className="h2 mb-1">Tin đang so sánh trên bản đồ</h2>
          <p className="text-[12.5px] text-coal-500 mb-4">
            Chấm xanh đánh số theo thứ tự trong giỏ. Vị trí là <b>tâm quận</b> — tin
            đăng không ghi toạ độ cụ thể, nên đây là khu vực chứ không phải địa chỉ
            chính xác của căn nhà.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {compare.map((it, i) => (
              <a
                key={it.id}
                href={`/chi-tiet?d=${it.d}&slug=${encodeURIComponent(it.slug)}`}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white/80
                           border border-sky-200 hover:border-sky-400 transition-colors"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-sky-400 text-slate-900
                                 text-[11px] font-extrabold grid place-items-center">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-coal-900 clamp-2">
                    {it.title}
                  </span>
                  <span className="block text-[11.5px] text-coal-500 mt-0.5">
                    {it.district_name} · {it.price.toLocaleString('vi-VN')} triệu
                  </span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- chi tiết chọn */}
      {picked && (
        <div className="mt-6">
          <Note tone="info" title={picked.name}>
            <div className="mt-1 space-y-1">
              {picked.address && <p>{picked.address}</p>}
              {picked.district_name && <p>Khu vực: <b>{picked.district_name}</b></p>}
              <p>Số tin đăng: <b>{picked.listings}</b></p>
              <div className="flex gap-2 mt-3">
                <Link href={`/tim-kiem/?project=${picked.id}`} className="btn-primary btn-sm">
                  Xem tin đăng
                </Link>
                <button onClick={() => setPicked(null)} className="btn-ghost btn-sm">
                  Đóng
                </button>
              </div>
            </div>
          </Note>
        </div>
      )}

      {/* --------------------------------------------------------------- danh sách */}
      {rows.length > 0 && (
        <section className="mt-10">
          <h2 className="h2 mb-4">Danh sách dự án trên bản đồ</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.slice(0, 24).map((p) => (
              <Link
                key={p.id}
                href={`/tim-kiem/?project=${p.id}`}
                className="p-4 rounded-2xl bg-white/80 backdrop-blur border border-cream-300
                           shadow-soft hover:-translate-y-1 hover:border-gold-300
                           hover:shadow-lift transition-all duration-300"
              >
                <div className="flex items-start gap-2">
                  <iconify-icon icon="lucide:map-pin"
                                className="text-flame-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-coal-900 truncate">{p.name}</p>
                    {p.address && (
                      <p className="text-[11.5px] text-coal-500 clamp-1 mt-0.5">{p.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[11px]">
                  <span className="chip">{p.listings} tin</span>
                  {p.district_name && <span className="text-coal-400">{p.district_name}</span>}
                </div>
              </Link>
            ))}
          </div>
          {rows.length > 24 && (
            <p className="text-[13px] text-coal-400 mt-4">
              và {rows.length - 24} dự án khác — dùng ô tìm kiếm để lọc.
            </p>
          )}
        </section>
      )}
    </div>
  );
}