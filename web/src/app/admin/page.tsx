'use client';

import { useEffect, useState } from 'react';
import { AdminGate, AdminNav, AdminHeader, useAdmin } from '@/components/admin/AdminGate';
import { StatCard, SectionCard, Note } from '@/components/ui';
import { u } from '@/lib/basePath';

interface Stats {
  published: number; pending: number; expired: number; projects: number;
  agents: number; new_leads: number; reveals_24h: number;
  open_alerts: number; new_today: number;
}

function Dash() {
  const a = useAdmin();
  const [s, setS] = useState<Partial<Stats>>({});
  const [err, setErr] = useState('');

  useEffect(() => {
    a.callApi('/api/admin/stats')
      .then((r) => setS(r.data || {}))
      .catch((e) => setErr(e.message));
  }, [a]);

  const cards = [
    { icon: 'lucide:home',        label: 'Tin đang đăng', value: s.published,  href: '/admin/tin-dang' },
    { icon: 'lucide:clock',       label: 'Chờ duyệt',    value: s.pending,   href: '/admin/tin-dang?status=pending' },
    { icon: 'lucide:calendar-x',  label: 'Hết hạn',     value: s.expired,   href: '/admin/tin-dang?status=expired' },
    { icon: 'lucide:building-2',  label: 'Dự án',       value: s.projects,  href: '/admin/du-an' },
    { icon: 'lucide:badge-check', label: 'Môi giới',    value: s.agents },
    { icon: 'lucide:message-square', label: 'Yêu cầu mới', value: s.new_leads, href: '/admin/lien-he' },
    { icon: 'lucide:phone-call',  label: 'Xem SĐT 24h',  value: s.reveals_24h, href: '/admin/canh-bao' },
    { icon: 'lucide:shield-alert', label: 'Cảnh báo',   value: s.open_alerts, href: '/admin/canh-bao' },
  ];

  const TASKS: [string, string, boolean][] = [
    ['Duyệt tin mới', '/admin/tin-dang?status=pending', (s.pending ?? 0) > 0],
    ['Xử lý yêu cầu liên hệ', '/admin/lien-he', (s.new_leads ?? 0) > 0],
    ['Xử lý cảnh báo bảo mật', '/admin/canh-bao', (s.open_alerts ?? 0) > 0],
    ['Gia hạn tin sắp hết hạn', '/admin/tin-dang?status=expired', (s.expired ?? 0) > 0],
  ];

  const fmt = (v?: number) => (v == null ? '—' : v.toLocaleString('vi-VN'));

  return (
    <>
      <AdminNav active="tong-quan" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <AdminHeader
          title="Tổng quan"
          sub="Số liệu toàn hệ thống, cập nhật theo thời gian thực"
          action={
            <a href={u('/admin/tin-dang/tao')} className="btn-primary btn-sm">
              <iconify-icon icon="lucide:plus" /> Tạo tin
            </a>
          }
        />

        {err && (
          <div className="mb-6">
            <Note tone="danger" title="Không tải được thống kê">
              {err}
              <p className="mt-1 text-[12px]">
                Kiểm tra Worker đã có route <code>/api/admin/stats</code> và hàm
                <code> api_admin_stats()</code> đã được nạp trong SQL.
              </p>
            </Note>
          </div>
        )}

        {/* -------------------------------------------------------------- KPI */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {cards.map((c) => (
            <StatCard
              key={c.label}
              icon={c.icon}
              label={c.label}
              value={fmt(c.value)}
              href={c.href}
            />
          ))}
        </div>

        {/* ------------------------------------------------------ cảnh báo */}
        {(s.open_alerts ?? 0) > 0 && (
          <div className="mb-6">
            <Note tone="warn" title={`Có ${s.open_alerts} cảnh báo bảo mật chưa xử lý`}>
              Có thể là bot đang cào dữ liệu, truy cập URL bẫy hoặc gọi API bất thường.
              <a href={u('/admin/canh-bao')} className="block mt-2">
                <span className="btn-primary btn-sm">Xem cảnh báo</span>
              </a>
            </Note>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ------------------------------------------------------- việc cần làm */}
          <SectionCard title="Việc cần làm" icon="lucide:list-checks">
            <div className="space-y-2.5">
              {TASKS.map(([label, href, urgent]) => (
                <a
                  key={label}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                              transition-colors duration-200 ${
                                urgent
                                  ? 'border-amber-200 bg-amber-50 hover:border-amber-400'
                                  : 'border-cream-200 opacity-55 hover:opacity-100'
                              }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    urgent ? 'bg-amber-500' : 'bg-cream-300'
                  }`} />
                  <span className="text-[13.5px] font-semibold text-coal-700">{label}</span>
                  <iconify-icon icon="lucide:arrow-right" className="ml-auto text-coal-400" />
                </a>
              ))}
            </div>
          </SectionCard>

          {/* ------------------------------------------------------ ghi chú vận hành */}
          <SectionCard title="Ghi chú bảo mật" icon="lucide:shield-check">
            <ul className="space-y-3 text-[13px] text-coal-600">
              {[
                'Phân quyền thực thi ở tầng database (Row Level Security), không phải ở Worker — nên kể cả Worker lỗi, RLS vẫn chặn đúng.',
                'Mỗi lượt xem số điện thoại đều được ghi lại. Nếu một tài khoản xem hàng loạt, số liệu ở thẻ “Xem SĐT 24h” sẽ tăng bất thường.',
                'Địa chỉ chi tiết của căn hộ nằm ở bảng riêng, không xuất hiện trong API danh sách.',
                'Khi thấy cùng một fingerprint tạo hàng nghìn cảnh báo, bấm “Chặn” ở trang Cảnh báo.',
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <iconify-icon icon="lucide:check-circle-2" className="text-green-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

export default function AdminPage() {
  return <AdminGate>{(a) => <Dash key={a.user_id} />}</AdminGate>;
}