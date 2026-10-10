'use client';

import { useEffect, useState } from 'react';
import { AdminGate, AdminNav, AdminHeader, useAdmin } from '@/components/admin/AdminGate';
import { Note } from '@/components/ui';

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  message: string | null;
  source: string | null;
  status: string;
  listing_id: string | null;
  agent_id: string | null;
  created_at: string;
}

const STATUS: Record<string, [string, string]> = {
  new:       ['Mới',           'bg-amber-500/10 text-amber-500'],
  contacted: ['Đã liên hệ',   'bg-flame-50 text-flame-700'],
  closed:    ['Đã chốt',      'bg-green-50 text-green-700'],
  spam:      ['Spam',          'bg-cream-200 text-coal-500'],
};

const SOURCE: Record<string, string> = {
  listing:      'Từ trang tin',
  project:      'Từ trang dự án',
  contact_form: 'Biểu mẫu liên hệ',
};

const FILTERS = [['', 'Tất cả'], ['new', 'Mới'], ['contacted', 'Đã liên hệ'],
                 ['closed', 'Đã chốt'], ['spam', 'Spam']];

function Leads() {
  const a = useAdmin();
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => {
    setLoading(true);
    const p = status ? `?status=eq.${status}` : '?';
    a.callApi(`/api/admin/leads${p}order=created_at.desc&limit=100`)
      .then((r) => setRows(r.data || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [a, status]);

  const setStatusOf = async (id: string, next: string) => {
    setBusy(id); setErr('');
    try {
      await a.callApi(`/api/admin/leads?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <AdminNav active="lien-he" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <AdminHeader
          title="Yêu cầu liên hệ"
          sub="Khách hàng gửi qua biểu mẫu trên website"
        />

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setStatus(v)}
              className={status === v ? 'chip chip-active' : 'chip'}
            >
              {l}
            </button>
          ))}
        </div>

        {err && <div className="mb-4"><Note tone="danger">{err}</Note></div>}

        {loading ? (
          <div className="py-16 text-center text-coal-400">
            <iconify-icon icon="lucide:loader-2" className="text-3xl animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="section-card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-flame-50 text-flame-300
                            grid place-items-center mx-auto mb-4">
              <iconify-icon icon="lucide:inbox" className="text-3xl" />
            </div>
            <p className="text-coal-600 font-semibold">Chưa có yêu cầu nào</p>
            <p className="text-coal-400 text-sm mt-1">
              Yêu cầu từ biểu mẫu trang Liên hệ sẽ hiển thị ở đây.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((l) => (
              <div key={l.id} className="section-card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[15px] truncate">{l.full_name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1
                                    text-[12.5px] text-coal-500">
                      <a href={`tel:${l.phone}`}
                         className="inline-flex items-center gap-1 font-semibold text-flame-600
                                    hover:underline">
                        <iconify-icon icon="lucide:phone" /> {l.phone}
                      </a>
                      {l.email && (
                        <a href={`mailto:${l.email}`}
                           className="inline-flex items-center gap-1 truncate
                                      hover:text-flame-600 hover:underline">
                          <iconify-icon icon="lucide:mail" /> {l.email}
                        </a>
                      )}
                    </div>
                  </div>

                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold
                                   uppercase tracking-wide ${
                                     STATUS[l.status]?.[1] || 'bg-cream-200 text-coal-600'
                                   }`}>
                    {STATUS[l.status]?.[0] || l.status}
                  </span>
                </div>

                {l.message && (
                  <p className="text-[13px] text-coal-600 leading-relaxed bg-cream-100
                                rounded-xl p-3 mb-3 whitespace-pre-wrap break-words">
                    {l.message}
                  </p>
                )}

                <div className="flex items-center gap-2 text-[11.5px] text-coal-400 mb-3">
                  <iconify-icon icon="lucide:tag" />
                  {SOURCE[l.source || ''] || l.source || '—'}
                  <span className="text-cream-300">|</span>
                  {new Date(l.created_at).toLocaleString('vi-VN')}
                </div>

                <div className="flex flex-wrap gap-2">
                  {(['new', 'contacted', 'closed', 'spam'] as const)
                    .filter((s) => s !== l.status)
                    .map((s) => (
                      <button
                        key={s}
                        disabled={busy === l.id}
                        onClick={() => setStatusOf(l.id, s)}
                        className="text-[12px] font-semibold px-3 py-1.5 rounded-lg
                                   border border-cream-200 text-coal-600
                                   hover:border-flame-400 hover:text-flame-600
                                   transition-colors disabled:opacity-40"
                      >
                        → {STATUS[s][0]}
                      </button>
                    ))}
                  <a href={`tel:${l.phone}`} className="btn-primary btn-sm ml-auto">
                    <iconify-icon icon="lucide:phone-call" /> Gọi
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminLeadsPage() {
  return <AdminGate>{(a) => <Leads key={a.user_id} />}</AdminGate>;
}