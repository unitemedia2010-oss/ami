'use client';

/**
 * =============================================================================
 *  GIỎ SO SÁNH — nằm cố định ở đáy màn hình, có trên MỌI trang.
 *
 *  PC   : thanh ngang ở đáy, bấm để kéo lên xem danh sách.
 *  Mobile: nút tròn bám đáy phải (không chiếm chỗ đọc), bấm mở bảng nâng.
 *
 *  ⚠ Phải có trên TẤT CẢ trang, kể cả /chi-tiet — người dùng chọn tin ở
 *    trang tìm kiếm, mở xem một tin, rồi mới quyết định so sánh với tin cũ.
 *    Nếu chỉ có ở trang so sánh thì luồng đó đứt giữa chừng.
 * ========================================================================== */

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  COMPARE_EVENT, COMPARE_MAX, COMPARE_MIN, canCompare, clearCompare,
  compareUrl, getCompare, removeCompare, type CompareItem,
} from '@/lib/compare';
import { fmtPrice, fmtArea } from '@/lib/api';

const subscribe = (cb: () => void) => {
  window.addEventListener(COMPARE_EVENT, cb);
  window.addEventListener('storage', cb);      // đồng bộ giữa các tab
  return () => {
    window.removeEventListener(COMPARE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
};

/* Snapshot phía server phải là MẢNG RỖNG HẰNG SỐ.
   Nếu viết `() => []` thì mỗi render tạo tham chiếu mới, React coi là dữ
   liệu đổi và render lặp. */
const EMPTY: CompareItem[] = [];

export default function CompareDock() {
  const items = useSyncExternalStore(subscribe, getCompare, () => EMPTY);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || items.length === 0) return null;

  const con = items.length;
  const du = canCompare(items);

  /* -------------------------------------------------------------- nút tròn (mobile) */
  const fab = (
    <button
      onClick={() => setOpen(true)}
      aria-label={`Mở giỏ so sánh, ${con} tin`}
      className="lg:hidden fixed bottom-5 right-4 z-[61] h-14 w-14 rounded-full
                 bg-grad-flame text-white shadow-2xl grid place-items-center
                 active:scale-95 transition-transform"
    >
      <iconify-icon icon="lucide:git-compare-arrows" className="text-xl" />
      <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 rounded-full
                       bg-flame-900 text-white text-[11px] font-extrabold
                       grid place-items-center ring-2 ring-white">
        {con}
      </span>
    </button>
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
             onClick={() => setOpen(false)} aria-hidden />
      )}
      {fab}

      {/* ------------------------------------------------------------ giỏ trượt lên */}
      <div
        role="region"
        aria-label="Giỏ so sánh"
        className={`fixed inset-x-0 bottom-0 z-[62] transition-transform duration-300
                    ${open ? 'translate-y-0' : 'translate-y-full lg:translate-y-[130%]'}`}
      >
        <div className="mx-auto max-w-4xl px-3 pb-3 lg:px-6 lg:pb-6">
          <div
            className="rounded-2xl shadow-2xl overflow-hidden border border-gold-300
                       bg-gradient-to-b from-white to-cream-50"
          >
            {/* ---------------------------------------------------- thanh điều khiển */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-2 font-extrabold text-[13px]
                           text-flame-700 hover:text-flame-800 transition-colors"
              >
                <iconify-icon icon="lucide:git-compare-arrows" className="text-lg" />
                So sánh
                <span className="px-2 py-0.5 rounded-full bg-grad-flame text-white text-[11px]">
                  {con}/{COMPARE_MAX}
                </span>
                <iconify-icon
                  icon={open ? 'lucide:chevron-down' : 'lucide:chevron-up'}
                  className="transition-transform"
                />
              </button>

              <p className="hidden sm:block text-[12.5px] text-coal-500">
                {con < COMPARE_MIN
                  ? `Chọn thêm ${COMPARE_MIN - con} tin nữa để so sánh`
                  : 'Có thể so sánh ngay'}
              </p>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={clearCompare}
                  className="text-[12.5px] font-semibold text-coal-500 hover:text-red-600
                             transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  Xoá hết
                </button>
                <a
                  href={du ? compareUrl(items) : undefined}
                  aria-disabled={!du}
                  onClick={(e) => { if (!du) e.preventDefault(); }}
                  className={`btn-primary btn-sm ${du ? '' : 'opacity-40 pointer-events-none'}`}
                >
                  So sánh {con} tin
                  <iconify-icon icon="lucide:arrow-right" />
                </a>
              </div>
            </div>

            {/* -------------------------------------------------- ô đã chọn */}
            <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {items.map((it) => <Item key={it.id} it={it} />)}
              {Array.from({ length: Math.max(0, COMPARE_MAX - con) }).slice(0, 3).map((_, i) => (
                <div key={i}
                     className="hidden sm:grid place-items-center rounded-xl border-2
                                border-dashed border-cream-300 text-coal-300 text-[11px]">
                  còn {COMPARE_MAX - con} chỗ
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Item({ it }: { it: CompareItem }) {
  return (
    <div className="relative rounded-xl border border-cream-200 bg-white overflow-hidden">
      <a href={`/chi-tiet?d=${it.d}&slug=${encodeURIComponent(it.slug)}`} className="block">
        <div className="h-16 bg-cream-100 overflow-hidden">
          {it.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.image} alt="" loading="lazy"
                 className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-cream-300">
              <iconify-icon icon="lucide:building-2" className="text-xl" />
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="text-[11px] font-semibold text-coal-800 clamp-2 leading-tight">
            {it.title}
          </p>
          <p className="text-[11.5px] font-extrabold text-flame-600 mt-1">
            {fmtPrice(it.price, 'triệu', it.type)}
          </p>
          <p className="text-[10.5px] text-coal-400 mt-0.5 truncate">
            {[fmtArea(it.area), it.bedrooms ? `${it.bedrooms}PN` : null, it.district_name]
              .filter(Boolean).join(' · ')}
          </p>
        </div>
      </a>
      <button
        onClick={() => removeCompare(it.id)}
        aria-label={`Bỏ khỏi danh sách so sánh: ${it.title}`}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white
                   text-coal-500 shadow hover:bg-red-500 hover:text-white
                   transition-colors grid place-items-center"
      >
        <iconify-icon icon="lucide:x" className="text-xs" />
      </button>
    </div>
  );
}