'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function Pagination({
  page, total, perPage,
}: { page: number; total: number; perPage: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;

  const go = (p: number) => {
    const q = new URLSearchParams(params.toString());
    q.set('page', String(p));
    router.push(`/tim-kiem?${q.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // cửa sổ 5 trang quanh trang hiện tại
  const win: number[] = [];
  const add = (n: number) => { if (!win.includes(n)) win.push(n); };
  add(1);
  for (let p = Math.max(2, page - 1); p <= Math.min(pages - 1, page + 1); p++) add(p);
  add(pages);
  win.sort((a, b) => a - b);

  let prev = 0;
  const items = win.map((n) => {
    const gap = prev > 0 && n - prev > 1;
    prev = n;
    return { n, gap };
  });

  const btn = (active: boolean) =>
    `min-w-10 h-10 px-3 grid place-items-center rounded-xl text-sm font-bold border
     transition-colors duration-200 ${
       active
         ? 'bg-flame-600 border-flame-600 text-white'
         : 'bg-white border-cream-200 text-coal-700 hover:border-flame-400 hover:text-flame-600'
     }`;

  return (
    <nav className="flex items-center justify-center gap-2 flex-wrap py-12"
         aria-label="Phân trang">
      <button disabled={page <= 1} onClick={() => go(page - 1)}
              aria-label="Trang trước"
              className={`${btn(false)} disabled:opacity-40 disabled:cursor-not-allowed`}>
        <iconify-icon icon="lucide:chevron-left" />
      </button>

      {items.map(({ n, gap }, i) =>
        gap ? (
          <span key={`g${i}`} className="px-1 text-cream-300">…</span>
        ) : (
          <button key={n} onClick={() => go(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={btn(n === page)}>
            {n}
          </button>
        )
      )}

      <button disabled={page >= pages} onClick={() => go(page + 1)}
              aria-label="Trang sau"
              className={`${btn(false)} disabled:opacity-40 disabled:cursor-not-allowed`}>
        <iconify-icon icon="lucide:chevron-right" />
      </button>

      <span className="ml-2 text-[13px] text-coal-500">
        Trang {page}/{pages} · <b className="text-flame-600">{total.toLocaleString('vi-VN')}</b> tin
      </span>
    </nav>
  );
}