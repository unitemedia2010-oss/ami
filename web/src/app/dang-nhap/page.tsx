'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const storeKey = () =>
  `sb-${SB_URL ? new URL(SB_URL).hostname.split('.')[0] : 'demo'}-auth-token`;

function LoginInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get('next') || '/';

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const handle = async (signup: boolean) => {
    setErr(''); setMsg('');

    if (!SB_URL || !SB_KEY) {
      setErr('Chưa cấu hình NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }

    setBusy(true);
    try {
      const endpoint = signup
        ? `${SB_URL}/auth/v1/signup`
        : `${SB_URL}/auth/v1/token?grant_type=password`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error_description || j.msg || 'Thất bại');

      if (j.session) {
        // Supabase tự lưu session; ghi thêm để trang admin đọc được
        localStorage.setItem(storeKey(), JSON.stringify(j));
        setMsg('Thành công! Đang chuyển…');
        setTimeout(() => router.push(next), 700);
      } else {
        setMsg('Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.');
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">
      {/* --------------------------------------------------- cột trái: form */}
      <div className="flex items-center justify-center px-4 md:px-8 py-14">
        <div className="w-full max-w-md">
          <h1 className="h1 mb-2">
            {mode === 'in' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
          </h1>
          <p className="text-coal-500 text-sm mb-8">
            Miễn phí. Xem số điện thoại liên hệ không giới hạn số lượt.
          </p>

          <div className="section-card">
            <div className="grid grid-cols-2 gap-1 p-1 bg-cream-100 rounded-xl mb-6">
              {([['in', 'Đăng nhập'], ['up', 'Đăng ký']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => { setMode(v); setErr(''); setMsg(''); }}
                  className={`py-2.5 rounded-lg text-[13.5px] font-bold transition-all duration-200 ${
                    mode === v ? 'bg-white text-flame-600 shadow-card' : 'text-coal-500'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handle(false); }} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="lg-email">Email</label>
                <input
                  id="lg-email" type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="field" placeholder="ban@email.com"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="lg-pw">Mật khẩu</label>
                <input
                  id="lg-pw" type="password" required minLength={6}
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  value={pw} onChange={(e) => setPw(e.target.value)}
                  className="field" placeholder="Tối thiểu 6 ký tự"
                />
              </div>

              {err && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3
                                text-[13px] text-red-700">{err}</div>
              )}
              {msg && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3
                                text-[13px] text-green-700">{msg}</div>
              )}

              {mode === 'in' ? (
                <button type="submit" disabled={busy} className="btn-primary w-full h-12">
                  {busy ? 'Đang xử lý…' : 'Đăng nhập'}
                  {!busy && <iconify-icon icon="lucide:arrow-right" />}
                </button>
              ) : (
                <button type="button" disabled={busy}
                        onClick={() => handle(true)} className="btn-primary w-full h-12">
                  {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản miễn phí'}
                </button>
              )}
            </form>

            <p className="text-[12px] text-coal-400 mt-6 pt-5 border-t border-cream-200 leading-relaxed">
              Thông tin đăng nhập được dùng để đối chiếu khi bạn xem số điện thoại.
              Mỗi lượt xem đều được ghi nhận nhằm bảo vệ dữ liệu liên hệ của chủ đầu tư.
            </p>
          </div>

          <div className="text-center mt-6">
            <Link href="/" className="text-[13px] text-coal-500 hover:text-flame-600
                                     inline-flex items-center gap-1">
              <iconify-icon icon="lucide:arrow-left" /> Về trang chủ
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ cột phải: bán hàng */}
      <div className="hidden lg:flex bg-flame-600 text-white flex-col justify-center
                      px-12 py-14 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 30%, #fff 1.5px, transparent 1.5px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-white/10 grid place-items-center mb-6">
            <iconify-icon icon="lucide:shield-check" className="text-3xl text-orange-400" />
          </div>

          <h2 className="text-3xl font-extrabold leading-tight mb-5">
            Một tài khoản.<br />Xem số điện thoại không giới hạn.
          </h2>
          <p className="text-blue-100 text-[15px] leading-relaxed mb-8 max-w-md">
            Khi xem số điện thoại của một tin, thông tin đăng nhập giúp chúng tôi bảo vệ
            dữ liệu của chủ căn khỏi việc thu thập hàng loạt — đổi lại bạn xem số thoái
            miễn phí, không giới hạn số lượt.
          </p>

          <ul className="space-y-3.5">
            {[
              ['lucide:check-circle-2', 'Miễn phí, không giới hạn số lượt'],
              ['lucide:check-circle-2', 'Xem được địa chỉ đầy đủ của căn hộ'],
              ['lucide:check-circle-2', 'Lưu tin yêu thích trên mọi thiết bị'],
            ].map(([ic, t]) => (
              <li key={t} className="flex items-center gap-3 text-[15px]">
                <iconify-icon icon={ic} className="text-orange-400 text-xl shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-coal-400">Đang tải…</div>}>
      <LoginInner />
    </Suspense>
  );
}