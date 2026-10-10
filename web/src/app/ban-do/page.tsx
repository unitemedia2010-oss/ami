'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, type AdminUnit, type MapProject } from '@/lib/api';
import MapView from '@/components/MapView';
import type { MapPoint } from '@/lib/map';
import { SectionHeader, Note } from '@/components/ui';

export default function MapPage() {
  const [all, setAll] = useState<MapProject[]>([]);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [district, setDistrict] = useState('');
  const [q, setQ] = useState('');
  const [onlyWithListings, setOnlyWithListings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [picked, setPicked] = useState<MapProject | null>(null);

  useEffect(() => {
    api.adminUnits().then((r) => setUnits(r.districts)).catch(() => {});
    api.mapProjects()
      .then((r) => setAll(r.data || []))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Không tải được dữ liệu bản đồ'))
      .finally(() => setLoading(false));
  }, []);

  // lọc ở client cho tức thì, không gọi lại API mỗi lần gõ
  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return all.filter((p) => {
      if (onlyWithListings && p.listings === 0) return false;
      if (district && p.district_name !== units.find((d) => String(d.id) === district)?.name_new) {
        return false;
      }
      if (kw && !p.name.toLowerCase().includes(kw)
        && !(p.address || '').toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [all, q, district, onlyWithListings, units]);

  const points: MapPoint[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    approximate: p.approximate,
    price: p.listings ? `${p.listings} tin đăng` : 'Chưa có tin',
    href: `/tim-kiem/?project=${p.id}`,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <SectionHeader
        title="Bản đồ dự án bất động sản"
        sub="Xem các dự án chung cư theo vị trí trên bản đồ TP.HCM"
      />

      {err && <div className="mb-5"><Note tone="danger" title="Không tải được bản đồ">{err}</Note></div>}

      {/* -------------------------------------------------------------- lọc */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
          </p>
          {(q || district || onlyWithListings) && (
            <button
              onClick={() => { setQ(''); setDistrict(''); setOnlyWithListings(false); }}
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
        <MapView points={points} onSelect={(p) => setPicked(
          rows.find((r) => r.id === p.id) ?? null,
        )} />
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