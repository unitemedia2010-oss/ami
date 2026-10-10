'use client';

import { useState } from 'react';
import { AdminGate, AdminNav, useAdmin } from '@/components/admin/AdminGate';
import { u } from '@/lib/basePath';

function Form() {
  const a = useAdmin();
  const [f, setF] = useState({
    name: '', slug: '', developer: '', address: '',
    lat: '', lng: '', building_count: '', apartment_count: '',
    description: '', hero_image: '',
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setOk('');
    try {
      await a.callApi('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify({
          ...f,
          lat: f.lat ? Number(f.lat) : null,
          lng: f.lng ? Number(f.lng) : null,
          building_count: f.building_count ? Number(f.building_count) : null,
          apartment_count: f.apartment_count ? Number(f.apartment_count) : null,
          amenities,
          is_published: false,      // mặc định chưa công khai, admin bật tay
          is_verified: false,
        }),
      });
      setOk('Đã tạo dự án.');
      setTimeout(() => { location.href = u('/admin/du-an'); }, 800);
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminNav active="du-an" />
      <form onSubmit={submit} className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="h1 mb-5">Thêm dự án</h1>

        {err && (
          <div className="field-box border-red-200 bg-red-50 text-red-700 text-[13px] mb-4">{err}</div>
        )}
        {ok && (
          <div className="field-box border-green-200 bg-green-50 text-green-700 text-[13px] mb-4">{ok}</div>
        )}

        <section className="field-box mb-4">
          <h2 className="h2 mb-3.5">Thông tin dự án</h2>
          <div className="space-y-3.5">
            <div>
              <label className="field-label">Tên dự án *</label>
              <input required className="field" value={f.name}
                     onChange={(e) => set('name', e.target.value)}
                     placeholder="Vinhomes Central Park" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <label className="field-label">Chủ đầu tư</label>
                <input className="field" value={f.developer}
                       onChange={(e) => set('developer', e.target.value)}
                       placeholder="Vingroup" />
              </div>
              <div>
                <label className="field-label">Slug (để trống = tự sinh)</label>
                <input className="field" value={f.slug}
                       onChange={(e) => set('slug', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">Địa chỉ</label>
              <input className="field" value={f.address}
                     onChange={(e) => set('address', e.target.value)}
                     placeholder="Đường Lê Văn Lương, Phường Phú Thượng, Thanh Xuân" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <label className="field-label">Số toà nhà</label>
                <input type="number" className="field" value={f.building_count}
                       onChange={(e) => set('building_count', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Tổng số căn hộ</label>
                <input type="number" className="field" value={f.apartment_count}
                       onChange={(e) => set('apartment_count', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">URL ảnh bìa</label>
              <input className="field" value={f.hero_image}
                     onChange={(e) => set('hero_image', e.target.value)}
                     placeholder="https://img.bds.example.com/vinhomes-central-park.jpg" />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- toạ độ */}
        <section className="field-box mb-4">
          <h2 className="h2 mb-1">Toạ độ</h2>
          <p className="text-[12.5px] text-coal-500 mb-3.5 leading-relaxed">
            Nhập toạ độ tâm dự án. Trang chi tiết sẽ hiện bản đồ với mốc này.
            Mình <b>không tự đoán</b> toạ độ — sai là đưa người mua đến chỗ không có thật.
          </p>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="field-label">Vĩ độ (lat)</label>
              <input className="field" value={f.lat}
                     onChange={(e) => set('lat', e.target.value)}
                     placeholder="21.0350" />
            </div>
            <div>
              <label className="field-label">Kinh độ (lng)</label>
              <input className="field" value={f.lng}
                     onChange={(e) => set('lng', e.target.value)}
                     placeholder="105.8340" />
            </div>
          </div>

          {f.lat && f.lng && (
            <div className="mt-3.5 rounded-lg overflow-hidden border border-cream-200">
              <iframe
                title="Xem trước vị trí"
                className="w-full h-64 border-0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                  Number(f.lng) - 0.006}%2C${Number(f.lat) - 0.005}%2C${
                  Number(f.lng) + 0.006}%2C${Number(f.lat) + 0.005}&layer=mapnik&marker=${
                  f.lat}%2C${f.lng}`}
              />
              <div className="p-2.5 bg-cream-100 text-[12px] text-coal-600">
                Xem trước toạ độ bạn vừa nhập. Nếu mốc không nằm đúng chỗ, hãy sửa lại
                trước khi lưu.
              </div>
            </div>
          )}

          <details className="mt-3">
            <summary className="text-[12.5px] text-brand-600 cursor-pointer hover:underline">
              Hướng dẫn lấy toạ độ
            </summary>
            <ol className="text-[12.5px] text-coal-600 mt-2 space-y-1 list-decimal list-inside">
              <li>Mở <code>maps.google.com</code>, tìm tên dự án.</li>
              <li>Nhấp chuột phải đúng vào vị trí dự án.</li>
              <li>Chọn số toạ độ đầu tiên trong menu (ví dụ <code>21.0350, 105.8340</code>).</li>
              <li>Dán vào hai ô trên.</li>
              <li>Kiểm tra bản đồ xem trước có đúng không.</li>
            </ol>
          </details>
        </section>

        {/* ----------------------------------------------------- tiện ích */}
        <section className="field-box mb-4">
          <h2 className="h2 mb-3.5">Tiện ích dự án</h2>
          <div className="flex flex-wrap gap-1.5">
            {['hồ bơi', 'gym', 'spa', 'trường học', 'công viên', 'bbq',
              'hầm xe', 'sân tennis', 'cà phê', 'cảnh sát', 'siêu thị',
              'phòng sinh hoạt chung', 'công viên nước'].map((am) => (
              <button type="button" key={am}
                      onClick={() => setAmenities((p) =>
                        p.includes(am) ? p.filter((x) => x !== am) : [...p, am])}
                      className={`chip cursor-pointer ${amenities.includes(am) ? 'chip-accent' : ''}`}>
                {am}
              </button>
            ))}
          </div>
        </section>

        <section className="field-box mb-6">
          <h2 className="h2 mb-3.5">Mô tả</h2>
          <textarea rows={5} className="field" value={f.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Vị trí, quy mô, điểm nổi bật, tiện ích xung quanh…" />
        </section>

        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary h-11 px-8">
            {busy ? 'Đang lưu…' : 'Tạo dự án'}
          </button>
          <a href={u('/admin/du-an')} className="btn-outline h-11 px-6">Huỷ</a>
        </div>

        <p className="text-[12px] text-coal-400 mt-4">
          Dự án mới tạo ở trạng thái <b>chưa công khai</b>. Vào danh sách dự án để bật
          hiển thị khi đã kiểm tra thông tin và toạ độ.
        </p>
      </form>
    </>
  );
}

export default function AdminCreateProjectPage() {
  return <AdminGate>{(a) => <Form key={a.user_id} />}</AdminGate>;
}