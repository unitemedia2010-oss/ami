'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { u } from '@/lib/basePath';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Session {
  access_token: string;
  user_id: string;
  email: string;
}

interface AdminCtx extends Session {
  /** true = token hợp lệ. Phân quyền chi tiết do RLS ở tầng database quyết định. */
  callApi: (path: string, init?: RequestInit) => Promise<any>;
  signOut: () => void;
}

const Ctx = createContext<AdminCtx | null>(null);

export const useAdmin = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdmin phải nằm trong <AdminGate>');
  return v;
};

const authKey = () =>
  SB_URL ? `sb-${new URL(SB_URL).hostname.split('.')[0]}-auth-token` : '';

export function AdminGate({ children }: { children: (a: AdminCtx) => React.ReactNode }) {
  const [s, setS] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = authKey() ? localStorage.getItem(authKey()) : null;
    if (!raw) { setLoading(false); return; }
    try {
      const j = JSON.parse(raw);
      setS({ access_token: j.access_token, user_id: j.user?.id, email: j.user?.email });
    } catch {
      localStorage.removeItem(authKey());   // token hỏng → xoá, coi như chưa đăng nhập
    }
    setLoading(false);
  }, []);

  const value: AdminCtx | null = s
    ? {
        ...s,
        callApi: async (path, init) => {
          const res = await fetch(`${API}${path}`, {
            ...init,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${s.access_token}`,
              ...(init?.headers || {}),
            },
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
          return j;
        },
        signOut: () => {
          localStorage.removeItem(authKey());
          location.href = u('/dang-nhap');
        },
      }
    : null;

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center">
          <iconify-icon icon="lucide:loader-2" className="text-4xl text-flame-300 animate-spin" />
          <p className="text-coal-400 text-sm mt-3">Đang kiểm tra phiên đăng nhập…</p>
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-flame-50 text-flame-300
                          grid place-items-center mx-auto mb-5">
            <iconify-icon icon="lucide:lock" className="text-3xl" />
          </div>
          <h1 className="h2 mb-2">Cần đăng nhập</h1>
          <p className="text-coal-500 text-sm mb-6">
            Trang quản trị chỉ dành cho tài khoản có quyền.
          </p>
          <a href={u('/dang-nhap?next=/admin')} className="btn-primary w-full h-12">
            <iconify-icon icon="lucide:log-in" /> Đăng nhập
          </a>
        </div>
      </div>
    );
  }

  return <>{children(value)}</>;
}

const TABS = [
  { key: 'tong-quan', href: '/admin',       icon: 'lucide:layout-dashboard', label: 'Tổng quan' },
  { key: 'tin-dang',  href: '/admin/tin-dang',  icon: 'lucide:home',         label: 'Tin đăng' },
  { key: 'du-an',     href: '/admin/du-an',     icon: 'lucide:building-2',   label: 'Dự án' },
  { key: 'khach-hang', href: '/admin/khach-hang', icon: 'lucide:users',     label: 'Khách hàng' },
  { key: 'lien-he',   href: '/admin/lien-he',   icon: 'lucide:message-square', label: 'Yêu cầu' },
  { key: 'danh-muc',  href: '/admin/danh-muc',  icon: 'lucide:tags',         label: 'Danh mục' },
  { key: 'canh-bao',  href: '/admin/canh-bao',  icon: 'lucide:shield-alert',  label: 'Cảnh báo' },
];

export function AdminNav({ active }: { active: string }) {
  const a = useAdmin();

  return (
    <div className="relative overflow-hidden bg-liquid">
      <div aria-hidden className="absolute inset-0 bg-grid" />
      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        {/* ---------------------------------------------------- hàng trên */}
        <div className="flex items-center gap-4 h-14">
          <a href={u('/')} className="flex items-center gap-2 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-grad-flame text-white grid
                             place-items-center text-lg shadow-glow">
              <iconify-icon icon="lucide:flame" />
            </span>
            <span className="font-extrabold tracking-tight text-white hidden sm:inline">
              SG<span className="grad-text-anim">REALTY</span>
            </span>
            <span className="px-2 py-0.5 rounded glass-dark text-[11px] font-extrabold
                             uppercase tracking-wider text-white">
              Admin
            </span>
          </a>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-[12.5px] text-gold-100/80 hidden md:inline
                             truncate max-w-[200px]">
              {a.email}
            </span>
            <a href={u('/')} className="btn-sm rounded-full glass-dark text-white
                                 inline-flex items-center gap-1.5
                                 hover:bg-white/20 transition-colors duration-300">
              <iconify-icon icon="lucide:external-link" /> Xem web
            </a>
            <button
              onClick={a.signOut}
              className="btn-sm rounded-full bg-grad-gold text-flame-900 font-extrabold
                         shadow-glow hover:-translate-y-0.5 transition-all duration-300
                         inline-flex items-center gap-1.5"
            >
              <iconify-icon icon="lucide:log-out" /> Thoát
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------ tab điều hướng */}
        <nav className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {TABS.map((t) => (
            <a
              key={t.key}
              href={t.href}
              aria-current={active === t.key ? 'page' : undefined}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-bold
                          whitespace-nowrap rounded-t-xl transition-all duration-300 ${
                            active === t.key
                              ? 'bg-white/95 text-flame-700 shadow-soft'
                              : 'text-gold-100/80 hover:text-white hover:bg-white/[0.12]'
                          }`}
            >
              <iconify-icon icon={t.icon} className="text-base" />
              {t.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** Tiêu đề trang admin */
export function AdminHeader({
  title, sub, action,
}: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="h2">{title}</h1>
        {sub && <p className="text-[13px] text-coal-500 mt-1">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}