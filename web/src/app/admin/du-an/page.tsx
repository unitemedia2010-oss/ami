'use client';

import { useEffect, useState } from 'react';
import { AdminGate, AdminNav, AdminHeader, useAdmin } from '@/components/admin/AdminGate';
import { Note } from '@/components/ui';
import { u } from '@/lib/basePath';

interface Project {
  id: string; slug: string; name: string; developer: string | null;
  address: string | null; apartment_count: number | null; building_count: number | null;
  is_published: boolean; is_verified: boolean; lat: number | null; lng: number | null;
  /** URL ảnh đại diện. Rỗng → thẻ dự án hiện nền gradient kèm tên. */
  hero_image: string | null;
}

function Projects() {
  const a = useAdmin();
  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [kw, setKw] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => {
    setLoading(true);
    const p = kw.trim() ? `&name=ilike.*${encodeURIComponent(kw.trim())}*` : '';
    a.callApi(`/api/admin/projects?order=name${p}`)
      .then((r) => setRows(r.data || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [a, kw]);

  const toggle = async (p: Project, field: 'is_published' | 'is_verified') => {
    setBusy(p.id);
    try {
      await a.callApi(`/api/admin/projects?id=eq.${p.id}`, {
        method: 'PATCH', body: JSON.stringify({ [field]: !p[field] }),
      });
      setRows((prev) => prev.map((x) => (x.id === p.id ? { ...x, [field]: !x[field] } : x)));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };

  const noCoords = rows.filter((p) => p.lat == null || p.lng == null).length;
  const chuaCoAnh = rows.filter((p) => !p.hero_image).length;

  /* -------- gán / xoá ảnh dự án ----------
     Giao diện chạy được ngay. Việc lưu cần máy chủ: hiện bản deploy là
     dữ liệu tĩnh trong web/public/data, không có API để ghi ngược lại.
     Khi nối Worker/Supabase, hàm này chỉ cần đổi đường dẫn PATCH. */
  const [editAnh, setEditAnh] = useState<Project | null>(null);

  const luuAnh = async (p: Project, url: string) => {
    const v = url.trim();
    setBusy(p.id);
    try {
      await a.callApi(`/api/admin/projects?id=eq.${p.id}`, {
        method: 'PATCH', body: JSON.stringify({ hero_image: v || null }),
      });
      setRows((prev) => prev.map((x) => (x.id === p.id ? { ...x, hero_image: v || null } : x)));
      setEditAnh(null);
    } catch (e: any) {
      setErr(`${e.message} — chưa có máy chủ, thay đổi chưa được lưu. `
        + 'Sau khi nối Supabase, thao tác này sẽ hoạt động.');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <AdminNav active="du-an" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <AdminHeader
          title="Dự án"
          sub={`${rows.length} dự án`}
          action={
            <a href={u('/admin/du-an/tao')} className="btn-primary btn-sm">
              <iconify-icon icon="lucide:plus" /> Thêm dự án
            </a>
          }
        />

        {chuaCoAnh > 0 && (
          <div className="mb-4">
            <Note tone="info" title={`${chuaCoAnh} dự án chưa có ảnh`}>
              Dự án chưa có ảnh sẽ hiển thị nền gradient kèm tên thay vì ảnh.
              Bấm biểu tượng <b>ảnh</b> cạnh tên dự án để dán đường dẫn ảnh.
            </Note>
          </div>
        )}

        {noCoords > 0 && (
          <div className="mb-6">
            <Note tone="warn" title={`${noCoords} dự án chưa có toạ độ`}>
              Trang chi tiết sẽ không hiện bản đồ cho các dự án này.
              Xác định toạ độ qua Google Maps rồi điền vào.
            </Note>
          </div>
        )}

        <input
          value={kw} onChange={(e) => setKw(e.target.value)}
          placeholder="Tìm dự án theo tên…"
          aria-label="Tìm dự án"
          className="field-sm mb-6 max-w-sm"
        />

        {err && <div className="mb-4"><Note tone="danger">{err}</Note></div>}

        {loading ? (
          <div className="py-16 text-center text-coal-400">
            <iconify-icon icon="lucide:loader-2" className="text-3xl animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="section-card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-flame-50 text-flame-300
                            grid place-items-center mx-auto mb-4">
              <iconify-icon icon="lucide:building-2" className="text-3xl" />
            </div>
            <p className="font-bold mb-1">Chưa có dự án nào</p>
            <p className="text-coal-500 text-sm">
              Nhập danh sách dự án chung cư từ nguồn công khai để bắt đầu.
            </p>
          </div>
        ) : (
          <div className="section-card !p-0 overflow-x-auto">
            <table className="w-full text-[13px] min-w-[840px]">
              <thead>
                <tr className="border-b border-cream-200 text-left">
                  <th className="p-4 label-xs">Tên dự án</th>
                  <th className="p-4 label-xs">Ảnh</th>
                  <th className="p-4 label-xs">Chủ đầu tư</th>
                  <th className="p-4 label-xs text-center">Toà</th>
                  <th className="p-4 label-xs">Toạ độ</th>
                  <th className="p-4 label-xs text-center">Hiện trên web</th>
                  <th className="p-4 label-xs text-center">Xác minh</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-100/50">
                    <td className="p-4">
                      <p className="font-semibold text-coal-800">{p.name}</p>
                      {p.address && <p className="text-[11.5px] text-coal-400">{p.address}</p>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {p.hero_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.hero_image} alt=""
                               className="w-12 h-9 rounded object-cover shrink-0" />
                        ) : (
                          <span className="w-12 h-9 rounded bg-flame-50 text-flame-400
                                           grid place-items-center shrink-0">
                            <iconify-icon icon="lucide:image-off" />
                          </span>
                        )}
                        <button
                          disabled={busy === p.id}
                          onClick={() => setEditAnh(editAnh?.id === p.id ? null : p)}
                          className="btn-icon btn-sm text-coal-500 hover:text-flame-600"
                          aria-label="Gán ảnh dự án"
                        >
                          <iconify-icon icon="lucide:image-plus" />
                        </button>
                      </div>
                      {editAnh?.id === p.id && (
                        <div className="mt-2 w-64 space-y-2">
                          <input
                            className="field-sm"
                            defaultValue={p.hero_image || ''}
                            placeholder="https://… đường dẫn ảnh"
                            aria-label="Đường dẫn ảnh dự án"
                          />
                          <div className="flex gap-2">
                            <button
                              className="btn-primary btn-sm"
                              disabled={busy === p.id}
                              onClick={async (e) => {
                                const input = (e.target as HTMLElement)
                                  .closest('div')?.querySelector('input');
                                await luuAnh(p, input?.value ?? '');
                              }}
                            >
                              Lưu
                            </button>
                            <button className="btn-ghost btn-sm"
                                    onClick={() => setEditAnh(null)}>Huỷ</button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-coal-500 whitespace-nowrap">{p.developer || '—'}</td>
                    <td className="p-4 text-center text-coal-500">{p.building_count ?? '—'}</td>
                    <td className="p-4 whitespace-nowrap">
                      {p.lat != null && p.lng != null ? (
                        <a
                          href={`https://www.google.com/maps/@?api=1&view=center&lat=${p.lat}&lng=${p.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[12px] text-flame-600 font-semibold hover:underline"
                        >
                          {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                        </a>
                      ) : (
                        <span className="text-[12px] text-amber-700 font-semibold">chưa có</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        disabled={busy === p.id}
                        onClick={() => toggle(p, 'is_published')}
                        aria-label={p.is_published ? 'Đang hiển thị' : 'Đang ẩn'}
                        className={`btn-icon ${
                          p.is_published
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-cream-200 text-coal-400 hover:bg-cream-200'
                        } disabled:opacity-40`}
                      >
                        <iconify-icon icon={p.is_published ? 'lucide:eye' : 'lucide:eye-off'} />
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        disabled={busy === p.id}
                        onClick={() => toggle(p, 'is_verified')}
                        aria-label={p.is_verified ? 'Đã xác minh' : 'Đánh dấu đã xác minh'}
                        className={`btn-icon ${
                          p.is_verified
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-cream-200 text-coal-400 hover:bg-cream-200'
                        } disabled:opacity-40`}
                      >
                        <iconify-icon icon={p.is_verified ? 'lucide:badge-check' : 'lucide:badge'}
                                        className="text-lg" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="section-card mt-8">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <iconify-icon icon="lucide:map-pin" className="text-flame-600 text-xl" />
            Về toạ độ dự án
          </h2>
          <p className="text-[13px] text-coal-600 leading-relaxed">
            Hệ thống <b>không tự đoán</b> toạ độ. Toạ độ sai sẽ đưa người mua đến chỗ không
            có thật — nguy cơ pháp lý với chủ đầu tư và mất uy tín của website.
            Cách lấy: mở Google Maps → nhấp chuột phải vào vị trí dự án →
            Copy tọa độ.
          </p>
        </div>
      </div>
    </>
  );
}

export default function AdminProjectsPage() {
  return <AdminGate>{(a) => <Projects key={a.user_id} />}</AdminGate>;
}