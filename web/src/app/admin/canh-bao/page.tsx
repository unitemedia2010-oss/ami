'use client';

import { useEffect, useState } from 'react';
import { AdminGate, AdminNav, AdminHeader, useAdmin } from '@/components/admin/AdminGate';
import { Note, StatCard } from '@/components/ui';

interface Alert {
  id: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high';
  detail: any;
  ip_hash: string | null;
  created_at: string;
  resolved_at: string | null;
}

const TYPE: Record<string, [string, string]> = {
  bot_detected:     ['Phát hiện bot',            'lucide:bot'],
  rate_limit:       ['Vượt giới hạn truy cập',    'lucide:gauge'],
  honeypot_hit:     ['Truy cập URL bẫy',          'lucide:bug'],
  canary:           ['Bản ghi bẫy bị đọc',        'lucide:radar'],
  reveal_abuse:     ['Lạm dụng xem SĐT',          'lucide:phone-off'],
  sequential_crawl: ['Dò tuần tự hàng loạt',      'lucide:list-ordered'],
  ward_sweep:       ['Quét toàn bộ phường',       'lucide:map'],
  no_engagement:    ['Không có tương tác',        'lucide:user-x'],
  duplicate_content:['Nội dung trùng lặp',        'lucide:copy-check'],
  enumeration:      ['Dò ID liên tiếp',          'lucide:hash'],
  error:            ['Lỗi máy chủ',               'lucide:server-crash'],
};

const SEV: Record<string, [string, string]> = {
  high:   ['Nghiêm trọng', 'bg-red-50 text-red-700'],
  medium: ['Trung bình',   'bg-amber-50 text-amber-700'],
  low:    ['Thấp',         'bg-cream-200 text-coal-500'],
};

/** loại cảnh báo chỉ nên xem để tham khảo, không hành động gấp */
const LOW_PRIORITY = new Set(['low']);

function Alerts() {
  const a = useAdmin();
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [busy, setBusy] = useState(0);

  const load = () => {
    setLoading(true);
    const p = onlyOpen ? '?resolved_at=is.null' : '?';
    a.callApi(`/api/admin/access_alerts${p}order=created_at.desc&limit=100`)
      .then((r) => setRows(r.data || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [a, onlyOpen]);

  const resolve = async (id: number) => {
    setBusy(id);
    try {
      await a.callApi(`/api/admin/access_alerts?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved_at: new Date().toISOString() }),
      });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(0);
    }
  };

  const block = async (al: Alert) => {
    const fp = al.ip_hash;
    if (!fp) { alert('Cảnh báo này không có fingerprint để chặn'); return; }
    if (!confirm(`Chặn fingerprint ${fp.slice(0, 12)}… trong 7 ngày?`)) return;
    setBusy(al.id);
    try {
      await a.callApi('/api/admin/blocked_fingerprints', {
        method: 'POST',
        body: JSON.stringify({
          fingerprint: fp,
          reason: al.alert_type,
          blocked_until: new Date(Date.now() + 7 * 864e5).toISOString(),
        }),
      });
      alert('Đã thêm vào danh sách chặn. Worker sẽ từ chối ngay lượt truy cập kế tiếp.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(0);
    }
  };

  const grouped = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.alert_type] = (acc[r.alert_type] || 0) + 1;
    return acc;
  }, {});

  const critical = rows.filter((r) => r.severity === 'high' && !r.resolved_at).length;

  return (
    <>
      <AdminNav active="canh-bao" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <AdminHeader title="Cảnh báo bảo mật" sub="Dấu hiệu truy cập bất thường" />

        {critical > 0 && (
          <div className="mb-6">
            <Note tone="danger" title={`${critical} cảnh báo mức nghiêm trọng`}>
              Có dấu hiệu thu thập dữ liệu tự động. Xem chi tiết bên dưới và bấm
              <b> Chặn</b> cho fingerprint tạo ra nhiều cảnh báo.
            </Note>
          </div>
        )}

        {/* ------------------------------------------------------------ tổng hợp */}
        {Object.keys(grouped).length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {Object.entries(grouped)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([type, n]) => (
                <StatCard
                  key={type}
                  icon={TYPE[type]?.[1] || 'lucide:alert-triangle'}
                  label={TYPE[type]?.[0] || type}
                  value={n}
                />
              ))}
          </div>
        )}

        <label className="flex items-center gap-2.5 mb-6 text-[13px] text-coal-600 cursor-pointer">
          <input type="checkbox" checked={onlyOpen}
                 onChange={(e) => setOnlyOpen(e.target.checked)}
                 className="accent-flame-600-600 w-4 h-4" />
          Chỉ hiện cảnh báo chưa xử lý
        </label>

        {err && <div className="mb-4"><Note tone="danger">{err}</Note></div>}

        {/* ------------------------------------------------------------ danh sách */}
        {loading ? (
          <div className="py-16 text-center text-coal-400">
            <iconify-icon icon="lucide:loader-2" className="text-3xl animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="section-card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600
                            grid place-items-center mx-auto mb-4">
              <iconify-icon icon="lucide:shield-check" className="text-3xl" />
            </div>
            <p className="font-bold mb-1">Không có cảnh báo bất thường</p>
            <p className="text-coal-500 text-sm">Hệ thống đang hoạt động bình thường.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="section-card">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${
                    r.severity === 'high' ? 'bg-red-50 text-red-600'
                      : r.severity === 'medium' ? 'bg-amber-50 text-amber-600'
                      : 'bg-cream-200 text-coal-500'
                  }`}>
                    <iconify-icon icon={TYPE[r.alert_type]?.[1] || 'lucide:alert-triangle'}
                                  className="text-xl" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-[15px]">
                        {TYPE[r.alert_type]?.[0] || r.alert_type}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                       uppercase tracking-wide ${SEV[r.severity]?.[1]}`}>
                        {SEV[r.severity]?.[0] || r.severity}
                      </span>
                    </div>

                    <p className="text-[12px] text-coal-400 mt-1 flex flex-wrap items-center gap-x-3">
                      <span>{new Date(r.created_at).toLocaleString('vi-VN')}</span>
                      {r.ip_hash && (
                        <span>
                          fingerprint
                          <code className="ml-1 text-coal-600">{r.ip_hash.slice(0, 16)}…</code>
                        </span>
                      )}
                    </p>

                    {r.detail && Object.keys(r.detail).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-[12px] text-flame-600 cursor-pointer
                                           hover:underline inline-flex items-center gap-1">
                          <iconify-icon icon="lucide:code" /> Chi tiết
                        </summary>
                        <pre className="mt-2 text-[11.5px] bg-cream-100 rounded-xl p-3
                                        overflow-x-auto text-coal-600">
{JSON.stringify(r.detail, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {r.ip_hash && r.severity !== 'low' && (
                      <button disabled={busy === r.id} onClick={() => block(r)}
                              className="btn-sm rounded-xl bg-red-50 text-red-700 border border-red-200
                                         hover:bg-red-100 disabled:opacity-40 inline-flex
                                         items-center gap-1.5 font-bold">
                        <iconify-icon icon="lucide:ban" /> Chặn
                      </button>
                    )}
                    {!r.resolved_at && (
                      <button disabled={busy === r.id} onClick={() => resolve(r.id)}
                              className="btn-ghost btn-sm disabled:opacity-40">
                        <iconify-icon icon="lucide:check" /> Đã xử lý
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* -------------------------------------------------------- hướng dẫn đọc */}
        <div className="section-card mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <iconify-icon icon="lucide:book-open" className="text-flame-600 text-xl" />
            Cách đọc cảnh báo
          </h2>
          <dl className="space-y-4 text-[13px]">
            {[
              ['Honeypot — URL bẫy',
               'Bot truy cập link ẩn mà người thật không thấy. Đây là dấu hiệu chắc chắn đang có kẻ lập chỉ mục tự động.'],
              ['Phát hiện bot',
               'User-Agent là công cụ cào (curl, scrapy, puppeteer…) hoặc Turnstile thất bại nhiều lần liên tiếp.'],
              ['Vượt giới hạn truy cập',
               'Một fingerprint vượt ngưỡng trong giờ. Nếu lặp lại với cùng fingerprint nhiều lần → nên chặn.'],
              ['Lạm dụng xem SĐT',
               'Một tài khoản xem số điện thoại hàng loạt. Kiểm tra lại chính sách giới hạn trong bảng site_settings.'],
            ].map(([term, def]) => (
              <div key={term}>
                <dt className="font-bold mb-0.5">{term}</dt>
                <dd className="text-coal-600 leading-relaxed">{def}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[12px] text-coal-400 mt-5 pt-5 border-t border-cream-200">
            Nếu một fingerprint tạo ra hàng nghìn cảnh báo trong ngày, bấm
            <b> Chặn</b> — Worker sẽ từ chối ngay lượt truy cập kế tiếp của fingerprint đó.
          </p>
        </div>
      </div>
    </>
  );
}

export default function AdminAlertsPage() {
  return <AdminGate>{(a) => <Alerts key={a.user_id} />}</AdminGate>;
}