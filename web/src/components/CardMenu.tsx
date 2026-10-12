'use client';

/**
 * =============================================================================
 *  MENU NGỮ CẢNH CHO THẺ TIN — chuột phải trên PC, nhấn giữ trên điện thoại
 *
 *  Vì sao phải cẩn thận với "nhấn giữ":
 *    Người dùng lướt danh sách bằng ngón tay là hành động phổ biến nhất trên
 *    điện thoại. Nếu bắt kích hoạt khi chạm, mỗi lần cuộn sẽ bật menu lên —
 *    khó chịu hơn cả không có tính năng. Vì vậy bắt buộc thỏa cả hai điều kiện:
 *      1. giữ liên tục ≥ 480 ms, VÀ
 *      2. ngón tay không dịch quá 10 px.
 *    Lướt danh sách luôn di chuyển nhiều hơn 10 px nên không bao giờ kích hoạt.
 *
 *  Trên PC dùng chuột phải — không có rủi ro cuộn nên mở tức thì.
 *  Có hỗ trợ bàn phím (phím Menu / Shift+F10) để không bỏ rơi người dùng
 *  bàn phím như phần lớn menu ngữ cảnh ngoài đời.
 * ========================================================================== */

import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

const HOLD_MS = 480;        // ngưỡng giữ
const MOVE_TOL = 10;        // px được phép lệch

export interface MenuItem {
  icon: string;
  label: string;
  onSelect: () => void;
  /** đang bật → hiện dấu tick */
  active?: boolean;
  danger?: boolean;
}

interface Anchor { x: number; y: number }

/**
 * Trả về props để gắn lên thẻ + phần tử menu (render ở ngoài để tránh bị
 * `overflow: hidden` của thẻ cha cắt mất).
 */
export function useCardMenu(items: MenuItem[]) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [mounted, setMounted] = useState(false);

  /* items đổi mỗi lần render vì chứa closure; giữ trong ref để không phải
     setState lại không cần thiết. */
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPt = useRef({ x: 0, y: 0 });
  /* Sau khi nhấn giữ mở menu, lúc thả tay trình duyệt vẫn gửi `click` — nếu
     không chặn thì thẻ (là <Link>) sẽ điều hướng mất. Đây là lỗi kinh điển
     của long-press trên mobile. */
  const eatClick = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const clear = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  const open = useCallback((x: number, y: number) => {
    setAnchor({ x, y });
  }, []);

  const close = useCallback(() => {
    setAnchor(null);
    eatClick.current = false;
  }, []);

  /* --------------------------------------------------------------- sự kiện */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;      // PC đã có chuột phải
    clear();
    startPt.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      timer.current = null;
      eatClick.current = true;
      /* Không dùng toạ độ điểm nhấn làm mốc trên mobile: ngón tay che mất
         menu. Neo vào giữa thẻ cho dễ bấm trúng. */
      const r = (e.target as HTMLElement).closest('[data-menu-anchor]')
        ?.getBoundingClientRect();
      open(r ? r.left + r.width / 2 : e.clientX, r ? r.top + r.height / 2 : e.clientY);
    }, HOLD_MS);
  }, [clear, open]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!timer.current) return;
    const d = Math.hypot(e.clientX - startPt.current.x, e.clientY - startPt.current.y);
    if (d > MOVE_TOL) clear();      // đang lướt → không phải nhấn giữ
  }, [clear]);

  const onPointerUp = useCallback(() => clear(), [clear]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    open(e.clientX, e.clientY);
  }, [open]);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!eatClick.current) return;
    eatClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    /* e.key === 'ContextMenu' không đúng trên Safari/Firefox Windows nên
       kiểm tra thêm cả Shift+F10 — hai kiểu gọi chuột phải bằng bàn phím. */
    const wantMenu = e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10');
    if (!wantMenu) return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    open(r.left + 24, r.top + 24);
  }, [open]);

  /* Tự đóng khi bấm ra ngoài, cuộn trang, đổi kích thước, bấm Esc. */
  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-card-menu]')) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onScroll = () => close();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [anchor, close]);

  const bind = {
    'data-menu-anchor': '',
    onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp,
    onPointerLeave: onPointerUp,
    onContextMenu, onClickCapture, onKeyDown,
    /* chặn chọn chữ khi đang giữ, nếu không chữ sẽ bị highlight dài khi vuốt */
    style: { WebkitTouchCallout: 'none' } as CSSProperties,
  };

  const menu = anchor && mounted
    ? createPortal(
        <MenuPanel x={anchor.x} y={anchor.y} items={itemsRef.current} onClose={close} />,
        document.body,
      )
    : null;

  return { bind, menu, isOpen: !!anchor, close };
}

function MenuPanel({ x, y, items, onClose }:
{ x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties>({ left: x, top: y, visibility: 'hidden' });

  /* Đo rồi mới đặt vị trí để menu không bị nhảy. Lật sang trái/trên khi sát
     mép màn hình — trên điện thoại menu rộng gần hết màn nên dễ tràn. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const M = 8;
    let left = x;
    let top = y;
    if (left + r.width > window.innerWidth - M) left = Math.max(M, x - r.width);
    if (left < M) left = M;
    if (top + r.height > window.innerHeight - M) top = Math.max(M, y - r.height);
    if (top < M) top = M;
    setPos({ left, top, visibility: 'visible' });
  }, [x, y, items.length]);

  return (
    <div
      ref={ref}
      data-card-menu=""
      role="menu"
      style={pos}
      className="fixed z-[100] min-w-[210px] rounded-xl bg-white shadow-2xl
                 border border-cream-200 p-1.5 origin-top-left menu-in"
    >
      {items.map((it, i) => (
        <button
          key={`${it.label}-${i}`}
          role="menuitem"
          type="button"
          onClick={() => { it.onSelect(); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left
                      text-[13px] font-semibold transition-colors
                      ${it.danger ? 'text-red-600 hover:bg-red-50' : 'text-coal-700 hover:bg-cream-100'}`}
        >
          <iconify-icon icon={it.icon} className="text-base shrink-0 opacity-80" />
          <span className="flex-1">{it.label}</span>
          {it.active && (
            <iconify-icon icon="lucide:check" className="text-sm text-flame-600 shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
