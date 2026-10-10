'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminGate, AdminNav, AdminHeader, useAdmin } from '@/components/admin/AdminGate';
import { fmtPrice, type AdminUnit } from '@/lib/api';
import { Note } from '@/components/ui';
import { u } from '@/lib/basePath';

const STATUS: Record<string, [string, string]> = {
  published: ['Đang đăng',  'bg-green-50 text-green-700'],
  pending:   ['Chờ duyệt',  'bg-amber-500/10 text-amber-500'],
  draft:     ['Nháp',       'bg-cream-200 text-coal-600'],
  expired:   ['Hết hạn',    'bg-amber-50 text-amber-700'],
  hidden:    ['Đã ẩn',      'bg-cream-200 text-coal-500'],
  rejected:  ['Bị từ chối', 'bg-red-50 text-red-700'],
};

const FILTERS = [
  ['', 'Tất cả'], ['pending', 'Chờ duyệt'], ['published', 'Đang đăng'],
  ['expired', 'Hết hạn'], ['draft', 'Nháp'], ['hidden', 'Đã ẩn'],
];

interface Row {
  id: string; reference_code: string; slug: string; title: string;
  type: 'sell' | 'rent'; price: number; price_unit: 'triệu' | 'tỷ';
  status: string; area: number | null; bedrooms: number | null;
  view_count: number; created_at: string; agent_id: string | null;
  district_id: number | null; ward_id: number | null; project_id: string | null;
}

function ListInner() {
  const a = useAdmin();
  const sp = useSearchParams();
  const status = sp.get('status') || '';

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    a.callApi('/api/admin/admin-units').then((r) => setUnits(r.districts)).catch(() => {});
  }, [a]);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (q.trim()) p.set('q', q.trim());
    if (district) p.set('district', district);
    p.set('page', String(page));
    p.set('per_page', '25');

    a.callApi(`/api/admin/listings?${p}`)
      .then((r) => { setRows(r.data?.items || []); setTotal(r.data?.total || 0); setErr(''); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [a, status, q, district, page]);

  const patch = async (id: string, body: Record<string, unknown>, label: string) => {
    setBusyId(id); setErr('');
    try {
      await a.callApi(`/api/admin/listings/${id}`, {
        method: 'PATCH', body: JSON.stringify(body),
      });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...(body as Partial<Row>) } : r)));
    } catch (e: any) {
      setErr(`${label} thất bại: ${e.message}`);
    } finally {
      setBusyId('');
    }
  };

  const totalPages = Math.ceil(total / 25);

  return (
    <>
      <AdminNav active="tin-dang" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <AdminHeader
          title="Quản lý tin đăng"
          sub={`${total.toLocaleString('vi-VN')} tin · duyệt, ẩn hoặc gỡ`}
          action={
            <a href={u('/admin/tin-dang/tao')} className="btn-primary btn-sm">
              <iconify-icon icon="lucide:plus" /> Tạo tin
            </a>
          }
        />

        {/* ------------------------------------------------------------- lọc */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map(([v, l]) => (
            <button key={v} className={status === v ? 'chip chip-active' : 'chip'}
                    onClick={() => {
                      location.href = `/admin/tin-dang${v ? `?status=${v}` : ''}`;
                    }}>
              {l}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Tìm theo tiêu đề…"
            aria-label="Tìm tin"
            className="field-sm flex-1 min-w-[200px] max-w-xs"
          />
          <select value={district} onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
                  aria-label="Lọc theo khu vực"
                  className="field-sm w-auto min-w-[180px]">
            <option value="">Tất cả khu vực</option>
            {units.map((d) => <option key={d.id} value={d.id}>{d.name_new}</option>)}
          </select>
        </div>

        {err && <div className="mb-4"><Note tone="danger">{err}</Note></div>}

        {/* ------------------------------------------------------------ bảng */}
        {loading ? (
          <div className="py-16 text-center text-coal-400">
            <iconify-icon icon="lucide:loader-2" className="text-3xl animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="section-card text-center py-16 text-coal-400">
            Không có tin nào khớp bộ lọc
          </div>
        ) : (
          <div className="section-card !p-0 overflow-x-auto">
            <table className="w-full text-[13px] min-w-[900px]">
              <thead>
                <tr className="border-b border-cream-200 text-left">
                  <th className="p-4 label-xs">Tiêu đề</th>
                  <th className="p-4 label-xs">Giá</th>
                  <th className="p-4 label-xs">Khu vực</th>
                  <th className="p-4 label-xs text-center">Lượt xem</th>
                  <th className="p-4 label-xs">Trạng thái</th>
                  <th className="p-4 label-xs text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-100/50">
                    <td className="p-4 max-w-md">
                      <p className="font-semibold text-coal-800 clamp-2">{r.title}</p>
                      <p className="text-[11.5px] text-coal-400 mt-1">
                        {r.reference_code}
                        {r.area ? ` · ${r.area} m²` : ''}
                        {r.bedrooms ? ` · ${r.bedrooms}PN` : ''}
                        {' · '}{new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </td>
                    <td className="p-4 whitespace-nowrap font-bold text-flame-600">
                      {fmtPrice(r.price, r.price_unit, r.type)}
                    </td>
                    <td className="p-4 whitespace-nowrap text-coal-500">
                      {units.find((d) => d.id === r.district_id)?.name_new || '—'}
                    </td>
                    <td className="p-4 text-center text-coal-500">
                      {(r.view_count ?? 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold
                                       uppercase tracking-wide ${
                                         STATUS[r.status]?.[1] || 'bg-cream-200 text-coal-600'
                                       }`}>
                        {STATUS[r.status]?.[0] || r.status}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        {r.status !== 'published' && (
                          <button
                            disabled={busyId === r.id}
                            onClick={() => patch(r.id, { status: 'published' }, 'Duyệt tin')}
                            className="btn-icon bg-green-50 text-green-700 hover:bg-green-100
                                       disabled:opacity-40"
                            aria-label="Duyệt tin"
                            title="Duyệt tin"
                          >
                            <iconify-icon icon="lucide:check" />
                          </button>
                        )}
                        {r.status === 'published' && (
                          <button
                            disabled={busyId === r.id}
                            onClick={() => patch(r.id, { status: 'hidden' }, 'Ẩn tin')}
                            className="btn-icon bg-amber-50 text-amber-700 hover:bg-amber-100
                                       disabled:opacity-40"
                            aria-label="Ẩn tin"
                            title="Ẩn tin"
                          >
                            <iconify-icon icon="lucide:eye-off" />
                          </button>
                        )}
                        <a href={`/chi-tiet?slug=${encodeURIComponent(r.slug)}`}
                           className="btn-icon bg-flame-50 text-flame-600 hover:bg-flame-100"
                           aria-label="Xem tin" title="Xem tin">
                          <iconify-icon icon="lucide:external-link" />
                        </a>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => {
                            if (!confirm(`Gỡ tin “${r.title.slice(0, 50)}…”?`)) return;
                            patch(r.id, { status: 'hidden' }, 'Gỡ tin');
                          }}
                          className="btn-icon bg-red-50 text-red-600 hover:bg-red-100
                                     disabled:opacity-40"
                          aria-label="Gỡ tin" title="Gỡ tin"
                        >
                          <iconify-icon icon="lucide:trash-2" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-8">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                    className="btn-outline btn-sm disabled:opacity-40">
              <iconify-icon icon="lucide:chevron-left" />
            </button>
            <span className="text-[13px] text-coal-500">
              Trang {page}/{totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                    className="btn-outline btn-sm disabled:opacity-40">
              <iconify-icon icon="lucide:chevron-right" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminListingsPage() {
  return (
    <AdminGate>
      {(a) => (
        <Suspense fallback={<div className="p-10 text-coal-400">Đang tải…</div>}>
          <ListInner key={a.user_id} />
        </Suspense>
      )}
    </AdminGate>
  );
}