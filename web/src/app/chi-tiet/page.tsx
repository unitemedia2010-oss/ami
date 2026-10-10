'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  api, fmtPrice, fmtArea, timeAgo, AMENITY_LABEL, TURNSTILE_SITE_KEY,
  type ListingCard as C, type ContactResult,
} from '@/lib/api';
import { WatchButton } from '@/components/ListingCard';
import { coverImage } from '@/lib/cover';
import { MiniMap } from '@/components/MapView';
import { SectionCard, Note } from '@/components/ui';
import { u } from '@/lib/basePath';

/* =============================================================================
 *  Hộp xem số điện thoại
 *  Ba trạng thái: chưa đăng nhập → đăng nhập / đã đăng nhập → xác minh / đã lấy
 * ============================================================================= */
const authKey = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `sb-${url ? new URL(url).hostname.split('.')[0] : 'demo'}-auth-token`;
};

function RevealBox({ listing, slug }: { listing: C; slug: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<ContactResult | null>(null);
  const [err, setErr] = useState('');
  const [token, setToken] = useState('');
  const [loginUrl, setLoginUrl] = useState('');

  useEffect(() => {
    const back = `/dang-nhap?next=${encodeURIComponent(`/chi-tiet?slug=${slug}`)}`;
    const raw = localStorage.getItem(authKey());
    if (!raw) { setLoginUrl(back); return; }
    try {
      const j = JSON.parse(raw);
      const t = j?.access_token ?? j?.currentSession?.access_token;
      if (t) setToken(t);
      else setLoginUrl(back);
    } catch {
      setLoginUrl(back);
    }
  }, [slug]);

  // -------------------------------------------------------- chưa đăng nhập
  if (loginUrl) {
    return (
      <div>
        <p className="text-[13.5px] text-coal-600 mb-4">
          Đăng nhập để xem <b className="text-flame-600">số điện thoại</b> và
          <b className="text-flame-600"> địa chỉ đầy đủ</b> của căn hộ.
        </p>
        <Link href={loginUrl} className="btn-primary w-full h-12">
          <iconify-icon icon="lucide:log-in" /> Đăng nhập để xem SĐT
        </Link>
        <p className="text-[11.5px] text-coal-400 mt-3 text-center">
          Miễn phí · Không giới hạn số lượt xem
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------ đã lấy SĐT
  if (r) {
    return (
      <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-3">
          <iconify-icon icon="lucide:phone-call" className="mr-1" />
          Thông tin liên hệ
        </p>

        <a href={`tel:${r.phone_full}`} className="block text-2xl font-extrabold
           text-flame-600 hover:underline mb-2">
          {r.phone_full}
        </a>

        <div className="space-y-2 text-[13px]">
          {r.zalo && r.zalo !== r.phone_full && (
            <a href={`https://zalo.me/${r.zalo.replace(/\D/g, '')}`}
               target="_blank" rel="noopener noreferrer nofollow"
               className="flex items-center gap-2 text-coal-700 hover:text-flame-600">
              <iconify-icon icon="lucide:message-circle" className="text-flame-600" />
              Zalo: {r.zalo}
            </a>
          )}
          {r.owner_name && (
            <p className="flex items-center gap-2 text-coal-700">
              <iconify-icon icon="lucide:user" className="text-flame-600" />
              Người đăng: <b>{r.owner_name}</b>
            </p>
          )}
          {r.full_address && (
            <p className="flex items-start gap-2 text-coal-600">
              <iconify-icon icon="lucide:map-pin" className="text-flame-600 mt-0.5" />
              <span>{r.full_address}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- chưa lấy SĐT
  return (
    <div>
      {err && (
        <div className="mb-3">
          <Note tone="danger">{err}</Note>
        </div>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary w-full h-12 text-[15px]">
          <iconify-icon icon="lucide:phone" /> Xem số điện thoại
        </button>
      ) : (
        <div className="space-y-3">
          <div
            className="cf-turnstile"
            data-sitekey={TURNSTILE_SITE_KEY}
            data-callback={(t: string) => { (window as any).__ts = t; }}
          />
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true); setErr('');
              try {
                const ts = (window as any).__ts || '';
                const res = await api.revealContact(listing.id, token, ts);
                setR(res.data);
              } catch (e: any) {
                setErr(e.message || 'Không lấy được thông tin');
              } finally {
                setBusy(false);
              }
            }}
            className="btn-primary w-full h-12"
          >
            {busy ? 'Đang lấy…' : 'Hiện số điện thoại'}
          </button>
          <p className="text-[11.5px] text-coal-400 text-center leading-relaxed">
            Miễn phí · Không giới hạn · Mỗi lượt xem được ghi nhận để bảo vệ dữ liệu chủ đầu tư
          </p>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
 *  Trang chi tiết
 * ============================================================================= */
function DetailInner() {
  const sp = useSearchParams();
  const slug = sp.get('slug') || '';
  const [l, setL] = useState<C | null>(null);
  const [err, setErr] = useState('');
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!slug) { setErr('Thiếu mã tin'); return; }
    setImgIdx(0);
    api.detail(slug)
      .then((r) => setL(r.data))
      .catch((e) => setErr(e.message || 'Không tìm thấy tin'));
  }, [slug]);

  if (err) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cream-200 text-coal-400
                        grid place-items-center mx-auto mb-5">
          <iconify-icon icon="lucide:file-question" className="text-3xl" />
        </div>
        <h1 className="h2 mb-2">{err}</h1>
        <Link href="/tim-kiem" className="btn-primary mt-6">Xem tất cả tin</Link>
      </div>
    );
  }

  if (!l) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="skeleton h-96 rounded-2xl mb-4" />
        <div className="skeleton h-9 w-2/3 mb-3" />
        <div className="skeleton h-5 w-1/3" />
      </div>
    );
  }

  /* Ảnh thật nếu có, không thì vẽ SVG — xem giải thích ở lib/cover.ts */
  const imgs = l.images?.length
    ? l.images
    : [0, 1, 2].map((v) => coverImage(l.project_name || l.title, l.project_hue ?? 18, v));

  const detailRows: [string, string][] = [
    ['Mức giá', fmtPrice(l.price, l.price_unit, l.type) + (l.negotiable ? ' (thương lượng)' : '')],
    ...(l.tower_name ? [['Toà nhà', l.tower_name] as [string, string]] : []),
    ...(l.floor_number != null ? [['Tầng', String(l.floor_number)] as [string, string]] : []),
    ...(l.floors != null ? [['Tổng tầng', String(l.floors)] as [string, string]] : []),
    ...(l.furniture ? [['Nội thất', l.furniture] as [string, string]] : []),
    ...(l.project_name ? [['Dự án', l.project_name] as [string, string]] : []),
    ...(l.ward_name ? [['Phường/Xã', l.ward_name] as [string, string]] : []),
    ...(l.district_name ? [['Quận/Huyện', l.district_name] as [string, string]] : []),
  ];

  const SPECS: [string, string, string][] = [
    ['lucide:move-diagonal', 'Diện tích', fmtArea(l.area)],
    ['lucide:bed-double', 'Phòng ngủ', l.bedrooms ? `${l.bedrooms} phòng` : '—'],
    ['lucide:bath', 'Phòng tắm', l.bathrooms ? `${l.bathrooms} phòng` : '—'],
    ['lucide:compass', 'Hướng', l.direction || '—'],
  ];

  const amenities = [...(l.features || []), ...(l.project_amenities || [])]
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      {/* ---------------------------------------------------------- breadcrumb */}
      <nav aria-label="Đường dẫn" className="text-[12.5px] text-coal-400 mb-6 flex flex-wrap gap-1.5">
        <Link href="/" className="hover:text-flame-600">Trang chủ</Link>
        <span>/</span>
        <Link href={`/tim-kiem/?type=${l.type}`} className="hover:text-flame-600">
          {l.type === 'rent' ? 'Cho thuê' : 'Mua bán'}
        </Link>
        {l.district_name && (
          <>
            <span>/</span>
            <Link href={`/quan/${l.district_slug ?? ''}`} className="hover:text-flame-600">
              {l.district_name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        {/* ==================================================== cột trái */}
        <div>
          {/* ------------------------------------------------------------ ảnh */}
          <div className="rounded-2xl overflow-hidden border border-cream-200 shadow-card
                          bg-cream-200 mb-3">
            {imgs[imgIdx] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgs[imgIdx]} alt={l.title}
                   className="w-full aspect-[16/10] object-cover" />
            ) : (
              <div className="grid place-items-center aspect-[16/10] text-cream-300">
                <iconify-icon icon="lucide:building-2" className="text-7xl" />
              </div>
            )}
          </div>

          {imgs.length > 1 && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-6">
              {imgs.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  aria-label={`Ảnh ${i + 1}`}
                  className={`shrink-0 w-24 h-20 rounded-xl overflow-hidden border-2
                              transition-colors duration-200 ${
                                i === imgIdx
                                  ? 'border-amber-500'
                                  : 'border-transparent opacity-65 hover:opacity-100'
                              }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* -------------------------------------------------------- tiêu đề */}
          <div className="flex items-start gap-3 mb-3">
            <h1 className="h1 flex-1">{l.title}</h1>
            <WatchButton id={l.id} slug={l.slug} title={l.title}
                         className="shrink-0 !bg-white border border-cream-200 shadow-card" />
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className={`chip ${l.type === 'rent' ? '' : 'chip-active'}`}>
              {l.type === 'rent' ? 'Cho thuê' : 'Bán'}
            </span>
            {l.is_sponsored && (
              <span className="chip bg-amber-500/10 text-amber-500 border-amber-500/30">
                <iconify-icon icon="lucide:flame" /> Nổi bật
              </span>
            )}
            {l.published_at && (
              <span className="text-[12.5px] text-coal-400 flex items-center gap-1">
                <iconify-icon icon="lucide:clock" /> {timeAgo(l.published_at)}
              </span>
            )}
            <span className="text-[12.5px] text-cream-300">
              Mã {l.slug.slice(-8).toUpperCase()}
            </span>
          </div>

          {/* --------------------------------------------------------- thông số */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {SPECS.map(([ic, k, v]) => (
              <div key={k} className="section-card !p-4">
                <div className="w-9 h-9 rounded-lg bg-flame-50 text-flame-600
                                grid place-items-center mb-2">
                  <iconify-icon icon={ic} className="text-lg" />
                </div>
                <p className="label-xs">{k}</p>
                <p className="text-[15px] font-bold mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {/* --------------------------------------------------- chi tiết tin */}
          <div className="mb-4">
            <SectionCard title="Thông tin chi tiết" icon="lucide:list">
              <table className="w-full text-[13.5px]">
                <tbody>
                  {detailRows.map(([k, v]) => (
                    <tr key={k} className="border-b border-cream-200 last:border-0">
                      <td className="py-3 text-coal-500 w-40">{k}</td>
                      <td className="py-3 font-semibold">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>

          {amenities.length > 0 && (
            <div className="mb-4">
              <SectionCard title="Tiện ích" icon="lucide:sparkles">
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span key={a} className="chip">{AMENITY_LABEL[a] || a}</span>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {l.project_lat && l.project_lng && (
            <div className="mb-4">
              <SectionCard title="Vị trí trên bản đồ" icon="lucide:map">
                <MiniMap
                  lat={l.project_lat}
                  lng={l.project_lng}
                  name={l.project_name || 'Dự án'}
                  approximate={!!l.project_lat_approximate}
                />

                <div className="flex flex-wrap gap-2 mt-4">
                  <a
                    href={`https://www.google.com/maps/@?api=1&view=center&lat=${l.project_lat}&lng=${l.project_lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-outline btn-sm"
                  >
                    <iconify-icon icon="lucide:external-link" /> Mở Google Maps
                  </a>
                  <a href={u('/ban-do')} className="btn-ghost btn-sm">
                    <iconify-icon icon="lucide:map" /> Xem tất cả trên bản đồ
                  </a>
                </div>

                <p className="text-[11.5px] text-coal-400 mt-3 flex items-start gap-1.5">
                  <iconify-icon icon="lucide:info" className="shrink-0 mt-0.5" />
                  Bản đồ hiển thị vị trí của <b>dự án</b>, không phải toạ độ chính xác
                  của căn hộ — nhằm bảo vệ thông tin chủ căn.
                </p>
              </SectionCard>
            </div>
          )}
        </div>

        {/* ==================================================== cột phải */}
        <aside>
          <div className="lg:sticky lg:top-32 space-y-4">
            <div className="section-card">
              <p className="label-xs mb-1">{l.type === 'rent' ? 'Giá thuê' : 'Giá bán'}</p>
              <p className="text-3xl font-extrabold text-flame-600 mb-1">
                {fmtPrice(l.price, l.price_unit, l.type)}
              </p>
              {l.negotiable && (
                <p className="text-[12.5px] text-coal-400 mb-3 flex items-center gap-1">
                  <iconify-icon icon="lucide:handshake" /> Có thương lượng
                </p>
              )}

              <div className="border-t border-cream-200 pt-4 mt-3">
                <RevealBox listing={l} slug={slug} />
              </div>
            </div>

            {l.features?.length ? (
              <div className="section-card">
                <p className="label-xs mb-3">Tiện nghi kiện</p>
                <div className="flex flex-wrap gap-2">
                  {l.features.map((f, i) => <span key={i} className="chip">{f}</span>)}
                </div>
              </div>
            ) : null}

            <Link href="/tim-kiem" className="btn-outline w-full h-12">
              <iconify-icon icon="lucide:arrow-left" /> Xem tin khác
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function DetailPage() {
  return (
    <Suspense fallback={<div className="p-10 text-coal-400">Đang tải…</div>}>
      <DetailInner />
    </Suspense>
  );
}