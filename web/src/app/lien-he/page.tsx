'use client';

import { useEffect, useState } from 'react';
import { api, type AdminUnit } from '@/lib/api';
import { SectionHeader, Note } from '@/components/ui';
import { u } from '@/lib/basePath';

const TOPICS = [
  { v: 'ho-tro', l: 'Hỗ trợ người mua' },
  { v: 'dang-tin', l: 'Hỗ trợ người đăng tin' },
  { v: 'khieu-nai', l: 'Khiếu nại tin đăng' },
  { v: 'hop-tac', l: 'Hợp tác BĐS' },
  { v: 'khac', l: 'Vấn đề khác' },
];

export default function ContactPage() {
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    topic: 'ho-tro', message: '', listing_url: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    api.adminUnits().then((r) => setUnits(r.districts)).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setOk('');

    // Honeypot: ô ẩn, bot điền vào → âm thầm bỏ qua
    if (form.listing_url) { setOk('Đã gửi yêu cầu.'); setBusy(false); return; }

    try {
      await api.submitLead({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        message: `[${TOPICS.find((t) => t.v === form.topic)?.l}] ${form.message}`,
        source: 'contact_form',
      });
      setOk('Đã gửi! Chúng tôi phản hồi trong giờ làm việc, thường dưới 24 giờ.');
      setForm({ full_name: '', email: '', phone: '', topic: 'ho-tro', message: '', listing_url: '' });
    } catch (ex: any) {
      setErr(ex.message || 'Gửi thất bại. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <SectionHeader title="Liên hệ với chúng tôi" sub="Chúng tôi phản hồi trong giờ làm việc" />

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* ============================================================== form */}
        <form onSubmit={submit} className="section-card">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <iconify-icon icon="lucide:send" className="text-flame-600 text-xl" />
            Gửi yêu cầu
          </h2>
          <p className="text-coal-500 text-[13px] mb-6">
            Những trường có dấu <span className="text-amber-500">*</span> là bắt buộc.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="field-label" htmlFor="ct-name">Họ và tên *</label>
              <input id="ct-name" required className="field" value={form.full_name}
                     onChange={(e) => set('full_name', e.target.value)}
                     placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="field-label" htmlFor="ct-phone">Số điện thoại *</label>
              <input id="ct-phone" required type="tel" className="field" value={form.phone}
                     onChange={(e) => set('phone', e.target.value)}
                     placeholder="0901234567" />
            </div>
            <div>
              <label className="field-label" htmlFor="ct-email">Email</label>
              <input id="ct-email" type="email" className="field" value={form.email}
                     onChange={(e) => set('email', e.target.value)}
                     placeholder="ban@email.com" />
            </div>
            <div>
              <label className="field-label" htmlFor="ct-topic">Loại yêu cầu</label>
              <select id="ct-topic" className="field" value={form.topic}
                      onChange={(e) => set('topic', e.target.value)}>
                {TOPICS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="field-label" htmlFor="ct-msg">Nội dung *</label>
            <textarea id="ct-msg" required rows={6} className="field" value={form.message}
                      onChange={(e) => set('message', e.target.value)}
                      placeholder="Mô tả cụ thể vấn đề. Nếu khiếu nại tin, vui lòng ghi kèm mã tin." />
          </div>

          {/* Honeypot — người thật không thấy, bot hay điền */}
          <div className="hidden" aria-hidden>
            <label htmlFor="ct-url">URL</label>
            <input id="ct-url" tabIndex={-1} autoComplete="off" value={form.listing_url}
                   onChange={(e) => set('listing_url', e.target.value)} />
          </div>

          {err && <div className="mb-4"><Note tone="danger" title="Gửi thất bại">{err}</Note></div>}
          {ok && <div className="mb-4"><Note tone="success" title="Thành công">{ok}</Note></div>}

          <button type="submit" disabled={busy} className="btn-primary btn-lg">
            {busy ? 'Đang gửi…' : 'Gửi yêu cầu'}
            {!busy && <iconify-icon icon="lucide:arrow-right-circle" />}
          </button>
        </form>

        {/* ============================================================ thông tin */}
        <aside className="space-y-5">
          <div className="section-card">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <iconify-icon icon="lucide:clock" className="text-flame-600 text-xl" />
              Giờ làm việc
            </h2>
            <dl className="space-y-2.5 text-[13.5px]">
              {[
                ['Thứ 2 – Thứ 6', '08:00 – 17:30'],
                ['Thứ 7', '08:00 – 12:00'],
                ['Chủ nhật', 'Nghỉ'],
              ].map(([d, h]) => (
                <div key={d} className="flex justify-between">
                  <dt className="text-coal-500">{d}</dt>
                  <dd className="font-semibold">{h}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[12px] text-coal-400 mt-4 pt-4 border-t border-cream-200">
              Phản hồi trung bình dưới 4 giờ trong giờ làm việc.
            </p>
          </div>

          <div className="section-card">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <iconify-icon icon="lucide:phone-call" className="text-flame-600 text-xl" />
              Liên hệ nhanh
            </h2>
            <div className="space-y-3">
              {[
                ['lucide:phone', 'Hotline', '1900 xxxx'],
                ['lucide:mail', 'Email', 'hotro@sgrealty.vn'],
                ['lucide:map-pin', 'Văn phòng', 'TP. Hồ Chí Minh'],
              ].map(([ic, k, v]) => (
                <div key={k} className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-flame-50 text-flame-600
                                   grid place-items-center shrink-0">
                    <iconify-icon icon={ic} />
                  </span>
                  <div className="min-w-0">
                    <p className="label-xs">{k}</p>
                    <p className="text-[13.5px] font-semibold truncate">{v}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11.5px] text-coal-400 mt-4 pt-4 border-t border-cream-200">
              ⚠ Số hotline và địa chỉ văn phòng ở trên là giá trị mẫu — thay bằng thông
              tin thật của bạn trước khi website chính thức hoạt động.
            </p>
          </div>

          <div className="section-card">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <iconify-icon icon="lucide:map" className="text-flame-600 text-xl" />
              Khu vực phục vụ
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {units.slice(0, 15).map((d) => (
                <a key={d.id} href={`/quan/${d.slug}`} className="chip">{d.name_new}</a>
              ))}
            </div>
            {units.length > 15 && (
              <a href={u('/quan')} className="text-[13px] text-flame-600 font-semibold hover:underline mt-3 inline-block">
                Xem tất cả {units.length} khu vực →
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}