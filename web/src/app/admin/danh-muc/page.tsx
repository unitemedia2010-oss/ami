'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminGate, AdminNav, AdminHeader, useAdmin } from '@/components/admin/AdminGate';
import { Note, StatCard } from '@/components/ui';
import type { AdminUnit, AdminWard } from '@/lib/api';

/* =============================================================================
 *  Danh mục = 3 nhóm: quận/huyện, phường/xã, loại hình bất động sản
 *  Loại hình là hằng số trong mã nguồn nên để tại đây, không lưu DB.
 * ============================================================================= */
const PROPERTY_TYPES = [
  { slug: 'can-ho',      name: 'Căn hộ chung cư', icon: 'lucide:building-2' },
  { slug: 'chung-cu-mini', name: 'Chung cư mini',  icon: 'lucide:home' },
  { slug: 'nha-pho',    name: 'Nhà phố',          icon: 'lucide:house' },
  { slug: 'dat-nen',     name: 'Đất nền',          icon: 'lucide:land-plot' },
  { slug: 'van-phong',  name: 'Văn phòng',        icon: 'lucide:briefcase' },
  { slug: 'kho-xuong',  name: 'Kho, xưởng',       icon: 'lucide:warehouse' },
];

const TABS = [
  { key: 'quan',   label: 'Quận / Huyện', icon: 'lucide:map' },
  { key: 'phuong', label: 'Phường / Xã',   icon: 'lucide:map-pin' },
  { key: 'loai',   label: 'Loại hình',      icon: 'lucide:tags' },
];

function DanhMuc() {
  const a = useAdmin();
  const [tab, setTab] = useState<'quan' | 'phuong' | 'loai'>('quan');
  const [units, setUnits] = useState<{ districts: AdminUnit[]; wards: AdminWard[] }>({
    districts: [], wards: [],
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [kw, setKw] = useState('');
  const [busy, setBusy] = useState('');
  const [edit, setEdit] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    a.callApi('/api/admin/admin-units?include_inactive=true')
      .then(setUnits)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [a]);

  const patch = async (table: string, id: number, body: Record<string, unknown>, label: string) => {
    setBusy(`${table}-${id}`); setErr('');
    try {
      await a.callApi(`/api/admin/${table}?id=eq.${id}`, {
        method: 'PATCH', body: JSON.stringify(body),
      });
      setUnits((prev) => table === 'admin_districts'
        ? { ...prev, districts: prev.districts.map((d) => (d.id === id ? { ...d, ...body } as AdminUnit : d)) }
        : { ...prev, wards: prev.wards.map((w) => (w.id === id ? { ...w, ...body } as AdminWard : w)) });
      setEdit((p) => { const n = { ...p }; delete n[`${table}-${id}`]; return n; });
    } catch (e: any) {
      setErr(`${label} thất bại: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const wards = useMemo(() => {
    const list = units.wards;
    if (!kw.trim()) return list;
    const q = kw.trim().toLowerCase();
    return list.filter((w) => w.name_new.toLowerCase().includes(q));
  }, [units.wards, kw]);

  const districts = useMemo(() => {
    const list = units.districts as (AdminUnit & { is_active?: boolean; aliases?: string[]; verified?: boolean })[];
    if (!kw.trim()) return list;
    const q = kw.trim().toLowerCase();
    return list.filter((d) => d.name_new.toLowerCase().includes(q));
  }, [units.districts, kw]);

  return (
    <>
      <AdminNav active="danh-muc" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <AdminHeader title="Danh mục" sub="Đơn vị hành chính và loại hình bất động sản" />

        <div className="mb-6">
          <Note tone="warn" title="Tên hành chính phải đúng theo Nghị quyết">
            Tên quận, phường trong hệ thống hành chính Việt Nam thay đổi theo từng đợt sắp
            xếp. Sai một tên sẽ làm hỏng vĩnh viễn đường dẫn SEO của khu vực đó.
            Nguồn đối chiếu: <b>Nghị quyết 1685/NQ-UBTVQH15</b> và Quyết định của UBND TP.HCM.
          </Note>
        </div>

        {/* -------------------------------------------------------------- thẻ số */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard icon="lucide:map" label="Quận / Huyện" value={units.districts.length} />
          <StatCard icon="lucide:map-pin" label="Phường / Xã" value={units.wards.length} />
          <StatCard icon="lucide:tags" label="Loại hình" value={PROPERTY_TYPES.length} />
          <StatCard
            icon="lucide:badge-alert"
            label="Chưa xác minh"
            value={(units.districts as any[]).filter((d) => !d.verified).length}
          />
        </div>

        {/* --------------------------------------------------------------- tab */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
                          font-semibold transition-colors duration-200 ${
                            tab === t.key
                              ? 'bg-flame-600 text-white shadow-card'
                              : 'bg-white text-coal-600 border border-cream-200 hover:border-flame-300'
                          }`}
            >
              <iconify-icon icon={t.icon} />
              {t.label}
            </button>
          ))}
        </div>

        {err && <div className="mb-4"><Note tone="danger">{err}</Note></div>}

        {/* ========================================================== LOẠI HÌNH */}
        {tab === 'loai' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROPERTY_TYPES.map((t) => (
              <div key={t.slug} className="section-card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-flame-50 text-flame-600
                                grid place-items-center shrink-0">
                  <iconify-icon icon={t.icon} className="text-2xl" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold">{t.name}</p>
                  <p className="text-[12px] text-coal-400">/{t.slug}</p>
                </div>
              </div>
            ))}
            <div className="section-card !border-dashed text-coal-400 text-sm
                            grid place-items-center min-h-[84px]">
              Loại hình mới sửa trong <code>src/app/admin/danh-muc/page.tsx</code>
            </div>
          </div>
        )}

        {/* ======================================================== QUẬN / HUYỆN */}
        {tab === 'quan' && (
          <>
            <input
              value={kw} onChange={(e) => setKw(e.target.value)}
              placeholder="Tìm quận/huyện…"
              className="field-sm mb-4 max-w-sm"
            />
            <div className="section-card !p-0 overflow-x-auto">
              <table className="w-full text-[13px] min-w-[700px]">
                <thead>
                  <tr className="border-b border-cream-200 text-left">
                    <th className="p-4 label-xs">Tên hiện tại</th>
                    <th className="p-4 label-xs">Tên cũ</th>
                    <th className="p-4 label-xs">Slug</th>
                    <th className="p-4 label-xs">Xác minh</th>
                    <th className="p-4 label-xs text-right">Hiển thị</th>
                  </tr>
                </thead>
                <tbody>
                  {districts.map((d) => {
                    const key = `admin_districts-${d.id}`;
                    return (
                      <tr key={d.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-100/50">
                        <td className="p-4">
                          <input
                            defaultValue={d.name_new}
                            onBlur={(e) => e.target.value !== d.name_new &&
                              patch('admin_districts', d.id, { name_new: e.target.value }, 'Sửa tên')}
                            className="field-sm !py-1 font-semibold w-full max-w-[190px]"
                          />
                        </td>
                        <td className="p-4 text-coal-500 text-[12px] max-w-[180px] truncate">
                          {(d as any).name_old || '—'}
                        </td>
                        <td className="p-4">
                          <code className="text-[11.5px] text-flame-600 bg-flame-50
                                           px-2 py-1 rounded">/{d.slug}</code>
                        </td>
                        <td className="p-4">
                          <button
                            disabled={busy === key}
                            onClick={() => patch('admin_districts', d.id,
                              { verified: !(d as any).verified }, 'Xác minh')}
                            className={`btn-icon ${
                              (d as any).verified
                                ? 'bg-green-50 text-green-600'
                                : 'bg-amber-50 text-amber-600'
                            } disabled:opacity-40`}
                            aria-label="Xác minh tên"
                          >
                            <iconify-icon icon={(d as any).verified ? 'lucide:badge-check' : 'lucide:badge-alert'}
                                          className="text-lg" />
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            disabled={busy === key}
                            onClick={() => patch('admin_districts', d.id,
                              { is_active: !(d as any).is_active }, 'Đổi trạng thái')}
                            className={`btn-icon ${
                              (d as any).is_active
                                ? 'bg-green-50 text-green-600'
                                : 'bg-cream-200 text-coal-400'
                            } disabled:opacity-40`}
                            aria-label="Bật/tắt hiển thị"
                          >
                            <iconify-icon icon={(d as any).is_active ? 'lucide:eye' : 'lucide:eye-off'}
                                          className="text-lg" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ========================================================== PHƯỜNG / XÃ */}
        {tab === 'phuong' && (
          <>
            <input
              value={kw} onChange={(e) => setKw(e.target.value)}
              placeholder="Tìm phường/xã…"
              className="field-sm mb-4 max-w-sm"
            />
            {units.wards.length === 0 ? (
              <Note tone="info" title="Chưa nhập phường/xã">
                Danh sách 168 phường, xã lấy từ <b>Phụ lục Nghị quyết 1685/NQ-UBTVQH15</b>.
                Cột <code>slug</code> được trigger <code>fill_slug()</code> tự sinh từ tên,
                nên file CSV import chỉ cần: mã quận, tên mới, tên cũ, aliases.
              </Note>
            ) : (
              <div className="section-card !p-0 overflow-x-auto">
                <table className="w-full text-[13px] min-w-[560px]">
                  <thead>
                    <tr className="border-b border-cream-200 text-left">
                      <th className="p-4 label-xs">Mã</th>
                      <th className="p-4 label-xs">Tên phường / xã</th>
                      <th className="p-4 label-xs">Slug</th>
                      <th className="p-4 label-xs">Tên cũ</th>
                      <th className="p-4 label-xs text-right">Hiển thị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wards.map((w) => {
                      const key = `admin_wards-${w.id}`;
                      return (
                        <tr key={w.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-100/50">
                          <td className="p-4">
                            <code className="text-[11.5px] text-coal-500">{w.code}</code>
                          </td>
                          <td className="p-4">
                            <input
                              defaultValue={w.name_new}
                              onBlur={(e) => e.target.value !== w.name_new &&
                                patch('admin_wards', w.id, { name_new: e.target.value }, 'Sửa tên')}
                              className="field-sm !py-1 font-semibold w-full max-w-[200px]"
                            />
                          </td>
                          <td className="p-4">
                            <code className="text-[11.5px] text-flame-600 bg-flame-50
                                             px-2 py-1 rounded">/{w.slug}</code>
                          </td>
                          <td className="p-4 text-coal-500 text-[12px] max-w-[160px] truncate">
                            {(w as any).name_old || '—'}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              disabled={busy === key}
                              onClick={() => patch('admin_wards', w.id,
                                { is_active: !(w as any).is_active }, 'Đổi trạng thái')}
                              className={`btn-icon ${
                                (w as any).is_active !== false
                                  ? 'bg-green-50 text-green-600'
                                  : 'bg-cream-200 text-coal-400'
                              } disabled:opacity-40`}
                              aria-label="Bật/tắt hiển thị"
                            >
                              <iconify-icon icon="lucide:eye" className="text-lg" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function AdminCategoriesPage() {
  return <AdminGate>{(a) => <DanhMuc key={a.user_id} />}</AdminGate>;
}