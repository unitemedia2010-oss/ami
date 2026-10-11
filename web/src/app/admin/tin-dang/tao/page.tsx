'use client';

import { useEffect, useState } from 'react';
import { AdminGate, AdminNav, AdminHeader, useAdmin } from '@/components/admin/AdminGate';
import type { AdminUnit, AdminWard } from '@/lib/api';
import { SectionCard, Note } from '@/components/ui';
import { u } from '@/lib/basePath';

const AMENITIES = [
  'hồ bơi', 'gym', 'spa', 'trường học', 'công viên', 'bbq',
  'hầm xe', 'sân tennis', 'cà phê', 'cảnh sát', 'siêu thị',
];

const FURNITURE = ['Cơ bản', 'Đầy đủ', 'Nội thất cao cấp', 'Bàn ghế văn phòng', 'Không nội thất'];

const DIRECTIONS = [
  'Đông', 'Tây', 'Nam', 'Bắc', 'Đông Nam', 'Đông Bắc',
  'Tây Nam', 'Tây Bắc', 'Đông – Nam', 'Tây – Nam',
];

/** Bỏ dấu tiếng Việt để tạo slug không phụ thuộc thư viện ngoài */
function slugify(s: string) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd').replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function Form() {
  const a = useAdmin();

  const [type, setType] = useState<'sell' | 'rent'>('sell');
  const [f, setF] = useState({
    title: '', reference_code: '', project_id: '', tower_name: '',
    district_id: '', ward_id: '',
    price: '', area: '', bedrooms: '', bathrooms: '', floors: '',
    floor_number: '', direction: '', furniture: '',
    address_line: '', contact_name: '', contact_phone: '', contact_zalo: '',
    description: '',
  });
  const [features, setFeatures] = useState<string[]>([]);
  const [images, setImages] = useState('');
  const [units, setUnits] = useState<{ districts: AdminUnit[]; wards: AdminWard[] }>({
    districts: [], wards: [],
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    a.callApi('/api/admin/admin-units').then(setUnits).catch(() => {});
    a.callApi('/api/admin/projects?select=id,name,slug')
      .then((r) => setProjects(r.data || []))
      .catch(() => {});
  }, [a]);

  const wards = units.wards.filter((w) => w.district_id === Number(f.district_id));
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const imgList = images.split('\n').map((s) => s.trim()).filter(Boolean);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setOk('');

    const slug = `${slugify(f.reference_code || 'tin')}-${slugify(f.title).slice(0, 50)}`;

    try {
      await a.callApi('/api/admin/listings', {
        method: 'POST',
        body: JSON.stringify({
          reference_code: f.reference_code || `PR-${Date.now().toString().slice(-6)}`,
          slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          status: 'pending',                    // luôn chờ duyệt, không tự publish
          title: f.title,
          project_id: f.project_id || null,
          tower_name: f.tower_name || null,
          district_id: f.district_id ? Number(f.district_id) : null,
          ward_id: f.ward_id ? Number(f.ward_id) : null,
          address_line: f.address_line || null,  // ⭐ chỉ service_role ghi được
          price: Number(f.price) || 0,
          area: f.area ? Number(f.area) : null,
          bedrooms: f.bedrooms ? Number(f.bedrooms) : null,
          bathrooms: f.bathrooms ? Number(f.bathrooms) : null,
          floors: f.floors ? Number(f.floors) : null,
          floor_number: f.floor_number ? Number(f.floor_number) : null,
          direction: f.direction || null,
          furniture: f.furniture || null,
          description: f.description || null,
          features,
          images: imgList,
          contact_name: f.contact_name || null,
          contact_phone: f.contact_phone || null,
          contact_zalo: f.contact_zalo || null,
        }),
      });
      setOk('Đã tạo tin và chuyển sang hàng đợi duyệt.');
      setTimeout(() => { location.href = u('/admin/tin-dang?status=pending'); }, 900);
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminNav active="tin-dang" />
      <form onSubmit={submit} className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <AdminHeader title="Tạo tin đăng mới" sub="Tin sẽ ở hàng đợi duyệt trước khi hiện lên web" />

        {err && <div className="mb-6"><Note tone="danger" title="Không tạo được tin">{err}</Note></div>}
        {ok && <div className="mb-6"><Note tone="success">{ok}</Note></div>}

        {/* ------------------------------------------------------- thông tin cơ bản */}
        <SectionCard title="Thông tin cơ bản" icon="lucide:info" >
          <div className="grid grid-cols-2 gap-3 mb-5">
            {([['sell', 'Mua bán'], ['rent', 'Cho thuê']] as const).map(([v, l]) => (
              <button
                type="button" key={v} onClick={() => setType(v)}
                className={`h-12 rounded-xl text-sm font-bold transition-colors duration-200 ${
                  type === v
                    ? 'bg-amber-500 text-white shadow-card'
                    : 'bg-white text-coal-700 border border-cream-200 hover:border-flame-400'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="field-label">Tiêu đề tin *</label>
              <input required className="field" value={f.title}
                     onChange={(e) => set('title', e.target.value)}
                     placeholder={type === 'rent'
                       ? 'Cho thuê căn hộ 2PN 68m2 tại The Prive, view trực diện sông'
                       : 'Bán căn hộ 3PN 95m2 Vinhomes Central Park, full nội thất'} />
              <p className="text-[11.5px] text-coal-400 mt-1.5">
                Nêu rõ loại hình, diện tích, số phòng và điểm nổi bật. Tiêu đề chung chung
                là nguyên nhân phổ biến nhất khiến tin bị gỡ.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Mã tin (tự sinh nếu để trống)</label>
                <input className="field" value={f.reference_code}
                       onChange={(e) => set('reference_code', e.target.value)}
                       placeholder="PR-000123" />
              </div>
              <div>
                <label className="field-label">Dự án</label>
                <select className="field" value={f.project_id}
                        onChange={(e) => set('project_id', e.target.value)}>
                  <option value="">— Không thuộc dự án —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label">Toà nhà / Block</label>
              <input className="field" value={f.tower_name}
                     onChange={(e) => set('tower_name', e.target.value)}
                     placeholder="Toà E1, Block A" />
            </div>
          </div>
        </SectionCard>

        {/* ------------------------------------------------------------- vị trí */}
        <div className="mt-6">
          <SectionCard title="Vị trí" icon="lucide:map-pin">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Quận / Huyện *</label>
                <select required className="field" value={f.district_id}
                        onChange={(e) => { set('district_id', e.target.value); set('ward_id', ''); }}>
                  <option value="">— Chọn —</option>
                  {units.districts.map((d) => <option key={d.id} value={d.id}>{d.name_new}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Phường / Xã</label>
                <select className="field" value={f.ward_id} disabled={!f.district_id}
                        onChange={(e) => set('ward_id', e.target.value)}>
                  <option value="">— Chọn —</option>
                  {wards.map((w) => <option key={w.id} value={w.id}>{w.name_new}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="field-label">
                Địa chỉ chi tiết <span className="text-amber-500">*</span>
              </label>
              <input required className="field" value={f.address_line}
                     onChange={(e) => set('address_line', e.target.value)}
                     placeholder="Tòa E1, căn 02DN, đường Nguyễn Hữu Cảnh" />
              <div className="mt-3">
                <Note tone="warn">
                  Địa chỉ này <b>không hiển thị công khai</b>. Chỉ người đã đăng nhập mới
                  xem được, qua bước xác minh. Đây là lớp bảo vệ quan trọng nhất cho chủ căn.
                </Note>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ---------------------------------------------------------- đặc tính */}
        <div className="mt-6">
          <SectionCard title="Đặc tính căn hộ" icon="lucide:home">
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                ['price',  'Mức giá (triệu) *', type === 'rent' ? '15' : '8500', 'number', true],
                ['area',   'Diện tích (m²) *', '68.5', 'number', true],
                ['bedrooms', 'Số phòng ngủ', '', 'number', false],
                ['bathrooms', 'Số phòng tắm', '', 'number', false],
                ['floor_number', 'Tầng trong toà', '', 'number', false],
                ['floors', 'Tổng số tầng', '', 'number', false],
              ] as const).map(([k, label, ph, type2, req]) => (
                <div key={k}>
                  <label className="field-label">{label}</label>
                  <input
                    className="field"
                    type={type2}
                    step={k === 'area' ? '0.1' : k === 'price' ? '0.1' : undefined}
                    required={req}
                    placeholder={ph}
                    value={f[k]}
                    onChange={(e) => set(k, e.target.value)}
                  />
                </div>
              ))}

              <div>
                <label className="field-label">Hướng nhà</label>
                <select className="field" value={f.direction}
                        onChange={(e) => set('direction', e.target.value)}>
                  <option value="">— Chọn —</option>
                  {DIRECTIONS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Nội thất</label>
                <select className="field" value={f.furniture}
                        onChange={(e) => set('furniture', e.target.value)}>
                  <option value="">— Chọn —</option>
                  {FURNITURE.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="field-label">Tiện ích</label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((am) => (
                  <button
                    type="button" key={am}
                    onClick={() => setFeatures((p) =>
                      p.includes(am) ? p.filter((x) => x !== am) : [...p, am])}
                    className={`chip cursor-pointer ${features.includes(am) ? 'chip-active' : ''}`}
                  >
                    {am}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ------------------------------------------------------------- ảnh */}
        <div className="mt-6">
          <SectionCard title="Hình ảnh" icon="lucide:image">
            <label className="field-label">Danh sách URL (mỗi dòng một ảnh)</label>
            <textarea rows={4} className="field" value={images}
                      onChange={(e) => setImages(e.target.value)}
                      placeholder={'https://img.sgrealty.vn/a.jpg\nhttps://img.sgrealty.vn/b.jpg'} />
            <p className="text-[11.5px] text-coal-400 mt-2">
              Ảnh đầu tiên là ảnh bìa. Nên có tối thiểu 3 ảnh thực tế.
            </p>
            {imgList.length > 0 && (
              <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar">
                {imgList.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt=""
                       className="w-24 h-20 rounded-xl object-cover border border-cream-200 shrink-0" />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* -------------------------------------------------------- liên hệ */}
        <div className="mt-6">
          <SectionCard title="Thông tin liên hệ (bảo mật)" icon="lucide:shield">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="field-label">Họ tên</label>
                <input className="field" value={f.contact_name}
                       onChange={(e) => set('contact_name', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Số điện thoại *</label>
                <input required className="field" value={f.contact_phone}
                       onChange={(e) => set('contact_phone', e.target.value)}
                       placeholder="0901234567" />
              </div>
              <div>
                <label className="field-label">Zalo</label>
                <input className="field" value={f.contact_zalo}
                       onChange={(e) => set('contact_zalo', e.target.value)} />
              </div>
            </div>
            <div className="mt-4">
              <Note tone="info">
                Số điện thoại lưu ở bảng riêng, không bao giờ nằm trong API danh sách.
                Chỉ hiển thị sau khi người mua đăng nhập và vượt xác minh bot.
              </Note>
            </div>
          </SectionCard>
        </div>

        {/* ---------------------------------------------------------- mô tả */}
        <div className="mt-6">
          <SectionCard title="Mô tả chi tiết" icon="lucide:align-left">
            <textarea rows={6} className="field" value={f.description}
                      onChange={(e) => set('description', e.target.value)}
                      placeholder="Tình trạng căn, hướng view, tiện ích xung quanh, lý do bán/thuê…" />
          </SectionCard>
        </div>

        <div className="flex gap-3 mt-8">
          <button type="submit" disabled={busy} className="btn-primary h-12 px-8">
            {busy ? 'Đang gửi…' : 'Gửi duyệt'}
            {!busy && <iconify-icon icon="lucide:send" />}
          </button>
          <a href={u('/admin/tin-dang')} className="btn-outline h-12 px-6">Huỷ</a>
        </div>

        <p className="text-[12px] text-coal-400 mt-4">
          Tin được lưu ở trạng thái <b>chờ duyệt</b>. Bạn không thể tự đăng tin lên website
          mà không qua bước kiểm duyệt — đây là cách giữ chất lượng tin và giảm tin giả.
        </p>
      </form>
    </>
  );
}

export default function AdminCreateListingPage() {
  return <AdminGate>{(a) => <Form key={a.user_id} />}</AdminGate>;
}