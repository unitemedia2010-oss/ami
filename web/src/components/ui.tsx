'use client';

import Link from 'next/link';

/* =============================================================================
 *  StatCard — KPI
 * ========================================================================== */
export function StatCard({
  icon, label, value, delta, href,
}: {
  icon: string;
  label: string;
  value: string | number;
  delta?: string;
  href?: string;
}) {
  const body = (
    <div className="stat-card">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-300 to-amber-500
                      text-flame-900 grid place-items-center shrink-0
                      shadow-soft group-hover:shadow-glow transition-shadow">
        <iconify-icon icon={icon} className="text-2xl" />
      </div>
      <div className="min-w-0">
        <p className="label-xs">{label}</p>
        <p className="text-2xl font-extrabold text-coal-900 leading-tight">{value}</p>
        {delta && (
          <p className="text-[10.5px] font-bold text-green-600 mt-1 flex items-center gap-0.5">
            <iconify-icon icon="lucide:trending-up" /> {delta}
          </p>
        )}
      </div>
    </div>
  );

  return href
    ? <Link href={href} className="group block">{body}</Link>
    : <div className="group">{body}</div>;
}

/* =============================================================================
 *  SectionCard — khối nhóm trong admin
 * ========================================================================== */
export function SectionCard({
  title, icon, children, action,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="flex items-center gap-2.5 mb-6">
        {icon && (
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-300 to-amber-500
                           text-flame-900 grid place-items-center">
            <iconify-icon icon={icon} className="text-lg" />
          </span>
        )}
        <h2 className="text-lg font-bold text-coal-900">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/* =============================================================================
 *  SectionHeader — tiêu đề + link
 * ========================================================================== */
export function SectionHeader({
  title, sub, href, hrefLabel = 'Xem tất cả',
}: { title: string; sub?: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h2 className="h2">{title}</h2>
        {sub && <p className="text-[13px] text-coal-500 mt-1">{sub}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-sm font-extrabold text-flame-700 hover:text-flame-800
                     transition-colors duration-200 whitespace-nowrap inline-flex items-center gap-1"
        >
          {hrefLabel}
          <iconify-icon icon="lucide:arrow-right" className="transition-transform
                            duration-300 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/* =============================================================================
 *  BarChart — biểu đồ cột bằng CSS, không cần thư viện
 * ========================================================================== */
export function BarChart({
  data, max, suffix = '',
}: { data: { label: string; value: number; sub?: string }[]; max?: number; suffix?: string }) {
  const top = max ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3.5">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-[13px] font-semibold text-coal-700 truncate">{d.label}</span>
            <span className="text-[13px] font-extrabold grad-text shrink-0">
              {d.value.toLocaleString('vi-VN')}{suffix}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-cream-300 overflow-hidden">
            <div
              className="h-full rounded-full bg-grad-flame transition-all duration-700"
              style={{ width: `${Math.max(3, (d.value / top) * 100)}%` }}
            />
          </div>
          {d.sub && <p className="text-[11px] text-coal-400 mt-1">{d.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* =============================================================================
 *  Form
 * ========================================================================== */
export function FormInput({
  label, ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input {...props} className={`field ${props.className ?? ''}`} />
    </div>
  );
}

export function FormSelect({
  label, children, ...props
}: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <select {...props} className={`field ${props.className ?? ''}`}>{children}</select>
    </div>
  );
}

export function FormTextarea({
  label, ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <textarea {...props} className={`field ${props.className ?? ''}`} />
    </div>
  );
}

/* =============================================================================
 *  Note — hộp thông báo
 * ========================================================================== */
export function Note({
  tone = 'info', title, children,
}: { tone?: 'info' | 'warn' | 'danger' | 'success'; title?: string; children: React.ReactNode }) {
  const map = {
    info:    ['bg-white/85 border-gold-200 text-coal-700',
              'lucide:info', 'bg-gradient-to-br from-gold-300 to-amber-500 text-flame-900'],
    warn:    ['bg-amber-50 border-amber-300 text-amber-950',
              'lucide:alert-triangle', 'bg-gradient-to-br from-amber-300 to-orange-500 text-white'],
    danger:  ['bg-red-50 border-red-300 text-red-900',
              'lucide:shield-alert', 'bg-gradient-to-br from-flame-400 to-crimson-600 text-white'],
    success: ['bg-green-50 border-green-300 text-green-900',
              'lucide:check-circle', 'bg-gradient-to-br from-amber-300 to-green-600 text-white'],
  } as const;
  const [box, icon, chip] = map[tone];

  return (
    <div className={`rounded-2xl border p-4 flex gap-3 backdrop-blur ${box}`}>
      <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${chip}`}>
        <iconify-icon icon={icon} className="text-lg" />
      </span>
      <div className="text-[13px] leading-relaxed min-w-0">
        {title && <p className="font-bold mb-1">{title}</p>}
        {children}
      </div>
    </div>
  );
}