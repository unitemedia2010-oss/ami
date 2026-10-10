'use client';

import { useEffect, useState } from 'react';
import { AdminGate, AdminNav, AdminHeader, useAdmin } from '@/components/admin/AdminGate';
import { Note, StatCard } from '@/components/ui';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;      // Worker nối từ auth.users
  phone: string | null;
  role: 'customer' | 'agent' | 'editor' | 'admin' | 'super_admin';
  agency: string | null;
  commission_rate: number | null;
  is_verified: boolean;
  created_at: string;
}

const ROLES = ['customer', 'agent', 'editor', 'admin', 'super_admin'] as const;

const ROLE_META: Record<string, [string, string]> = {
  customer:     ['Khách hàng',  'bg-cream-200 text-coal-600'],
  agent:        ['Môi giới',    'bg-flame-50 text-flame-700'],
  editor:       ['Biên tập',    'bg-amber-50 text-amber-800'],
  admin:        ['Quản trị',   'bg-amber-500/10 text-amber-500'],
  super_admin:  ['Siêu quản trị', 'bg-red-50 text-red-700'],
};

function Users() {
  const a = useAdmin();
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('');
  const [kw, setKw] = useState('');

  const load = () => {
    setLoading(true);
    const p: string[] = [];
    if (filter) p.push(`role=eq.${filter}`);
    if (kw.trim()) p.push(`or=(full_name.ilike.*${encodeURIComponent(kw.trim())}*,phone.ilike.*${encodeURIComponent(kw.trim())}*)`);
    a.callApi(`/api/admin/users?${p.join('&')}${p.length ? '&' : ''}order=created_at.desc&limit=100`)
      .then((r) => setRows(r.data || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [a, filter, kw]);

  const patch = async (id: string, body: Record<string, unknown>, label: string) => {
    setBusy(id); setErr('');
    try {
      await a.callApi(`/api/admin/users?id=eq.${id}`, {
        method: 'PATCH', body: JSON.stringify(body),
      });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...(body as Partial<Profile>) } : r)));
    } catch (e: any) {
      setErr(`${label} thất bại: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.role] = (acc[r.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <AdminNav active="khach-hang" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <AdminHeader title="Tài khoản" sub="Phân quyền và thông tin môi giới" />

        {/* ------------------------------------------------------------- thống kê */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <StatCard icon="lucide:users" label="Tổng tài khoản" value={rows.length || '—'} />
          {(['agent', 'editor', 'admin'] as const).map((r) => (
            <StatCard
              key={r}
              icon={r === 'agent' ? 'lucide:badge-check' : r === 'editor' ? 'lucide:pencil' : 'lucide:shield'}
              label={ROLE_META[r][0]}
              value={counts[r] ?? 0}
            />
          ))}
          <StatCard icon="lucide:user-check" label="Đã xác minh"
                    value={rows.filter((r) => r.is_verified).length} />
        </div>

        {/* -------------------------------------------------------------- bộ lọc */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter('')} className={filter === '' ? 'chip chip-active' : 'chip'}>
              Tất cả
            </button>
            {ROLES.map((r) => (
              <button key={r} onClick={() => setFilter(r)}
                      className={filter === r ? 'chip chip-active' : 'chip'}>
                {ROLE_META[r][0]}
              </button>
            ))}
          </div>
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại…"
            className="field-sm flex-1 min-w-[200px] ml-auto"
          />
        </div>

        {err && <div className="mb-4"><Note tone="danger">{err}</Note></div>}

        <div className="mb-6">
          <Note tone="warn" title="Phân quyền là việc nhạy cảm">
            Chỉ nâng quyền cho người bạn tin cậy. Tài khoản <b>quản trị</b> có thể xem
            và sửa mọi tin đăng, thông tin liên hệ và cảnh báo bảo mật.
          </Note>
        </div>

        {/* -------------------------------------------------------------- bảng */}
        {loading ? (
          <div className="py-16 text-center text-coal-400">
            <iconify-icon icon="lucide:loader-2" className="text-3xl animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="section-card text-center py-16 text-coal-400">
            Không có tài khoản nào khớp bộ lọc
          </div>
        ) : (
          <div className="section-card !p-0 overflow-x-auto">
            <table className="w-full text-[13px] min-w-[760px]">
              <thead>
                <tr className="border-b border-cream-200 text-left">
                  <th className="p-4 label-xs">Người dùng</th>
                  <th className="p-4 label-xs">Liên hệ</th>
                  <th className="p-4 label-xs">Công ty</th>
                  <th className="p-4 label-xs">Vai trò</th>
                  <th className="p-4 label-xs text-right">Xác minh</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-100/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-flame-50 text-flame-600
                                         grid place-items-center text-xs font-bold shrink-0">
                          {(u.full_name || u.email || '?').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{u.full_name || '(chưa đặt tên)'}</p>
                          <p className="text-[11.5px] text-coal-400">
                            {new Date(u.created_at).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <p className="truncate">{u.email || '—'}</p>
                      {u.phone && (
                        <a href={`tel:${u.phone}`}
                           className="text-[12px] text-flame-600 hover:underline">
                          {u.phone}
                        </a>
                      )}
                    </td>

                    <td className="p-4">
                      <input
                        defaultValue={u.agency ?? ''}
                        placeholder="—"
                        disabled={busy === u.id}
                        onBlur={(e) => {
                          if (e.target.value !== (u.agency ?? '')) {
                            patch(u.id, { agency: e.target.value || null }, 'Cập nhật công ty');
                          }
                        }}
                        className="field-sm !py-1 !text-[12px] w-full max-w-[160px]"
                      />
                    </td>

                    <td className="p-4">
                      <select
                        value={u.role}
                        disabled={busy === u.id}
                        onChange={(e) => patch(u.id, { role: e.target.value }, 'Đổi vai trò')}
                        className={`field-sm !py-1 !text-[12px] font-semibold ${
                          ROLE_META[u.role]?.[1] || ''
                        }`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_META[r][0]}</option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        disabled={busy === u.id}
                        onClick={() => patch(u.id, { is_verified: !u.is_verified }, 'Xác minh')}
                        className={`btn-icon ${
                          u.is_verified
                            ? 'bg-green-50 text-green-600'
                            : 'bg-cream-200 text-coal-400 hover:bg-cream-200'
                        } disabled:opacity-40`}
                        aria-label={u.is_verified ? 'Bỏ xác minh' : 'Đánh dấu đã xác minh'}
                      >
                        <iconify-icon
                          icon={u.is_verified ? 'lucide:badge-check' : 'lucide:badge'}
                          className="text-lg"
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminUsersPage() {
  return <AdminGate>{(a) => <Users key={a.user_id} />}</AdminGate>;
}