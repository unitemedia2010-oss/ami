'use client';

import { useEffect, useRef, useState } from 'react';
import { loadLeaflet, createMap, type MapPoint } from '@/lib/map';
import { Note } from '@/components/ui';

/**
 * Bản đồ tương tác cho danh sách dự án.
 *
 * Leaflet là thư viện dùng DOM trực tiếp nên PHẢI hủy instance khi component
 * unmount — nếu không, mỗi lần đổi bộ lọc sẽ chồng thêm một bản đồ lên
 * bản đồ cũ, vừa tốn bộ nhớ vừa làm các marker nhân bản.
 */
export default function MapView({
  points,
  height = 'h-[460px]',
  showApproxWarning = true,
  emptyText = 'Chưa có dự án nào để hiển thị trên bản đồ.',
  onSelect,
}: {
  points: MapPoint[];
  height?: string;
  showApproxWarning?: boolean;
  emptyText?: string;
  onSelect?: (p: MapPoint) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState('');
  const approxCount = points.filter((p) => p.approximate).length;

  useEffect(() => {
    let alive = true;
    let instance: { map: any } | null = null;

    loadLeaflet()
      .then(() => {
        if (!alive || !el.current) return;
        instance = createMap(el.current, points, { onSelect }) as any;
        setReady(true);
      })
      .catch(() => setFailed('Không tải được thư viện bản đồ. Kiểm tra kết nối mạn.'));

    return () => {
      alive = false;
      // hủy đúng cách để Leaflet giải phóng listener và container
      try { instance?.map.remove(); } catch { /* đã bị gỡ */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length, ready]);

  if (points.length === 0) {
    return (
      <div className={`${height} rounded-2xl border border-cream-300 bg-white/70
                      backdrop-blur grid place-items-center text-coal-400 text-sm`}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`relative ${height} rounded-2xl overflow-hidden border
                      border-cream-300 shadow-soft bg-ink-100`}>
        <div ref={el} className="absolute inset-0" />

        {!ready && !failed && (
          <div className="absolute inset-0 grid place-items-center text-coal-500 text-sm">
            <div className="text-center">
              <iconify-icon icon="lucide:map" className="text-3xl animate-pulse mb-2" />
              Đang tải bản đồ…
            </div>
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 grid place-items-center p-4">
            <Note tone="danger" title="Không tải được bản đồ">{failed}</Note>
          </div>
        )}

        {ready && (
          <>
            <div className="absolute top-3 left-3 z-[400] px-3 py-1.5 rounded-full
                            glass-dark text-white text-[11.5px] font-bold
                            inline-flex items-center gap-1.5 shadow-soft">
              <iconify-icon icon="lucide:map-pin" />
              {points.length} vị trí
            </div>

            <div className="absolute bottom-3 left-3 z-[400] px-3 py-1.5 rounded-lg
                            glass-dark text-white/90 text-[10.5px] max-w-[85%] leading-snug">
              Cuộn chuột để phóng to — bấm vào bản đồ trước để kích hoạt
            </div>
          </>
        )}
      </div>

      {showApproxWarning && approxCount > 0 && (
        <Note tone="warn" title={`${approxCount} vị trí chưa có toạ độ chính xác`}>
          Mốc trên bản đồ đang đặt theo <b>tâm quận/huyện</b>, chỉ để tham khảo
          khu vực. Toạ độ thật của từng dự án cần được nhập từ Google Maps trong
          phần quản trị — mình không tự đoán vì toạ độ sai có thể đưa người mua
          đến chỗ không có thật.
        </Note>
      )}
    </div>
  );
}

/** Bản đồ nhỏ, dùng trong trang chi tiết */
export function MiniMap({
  lat, lng, name, approximate,
}: { lat: number; lng: number; name: string; approximate?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let instance: { map: any } | null = null;

    loadLeaflet().then(() => {
      if (!alive || !el.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instance = createMap(el.current, [{ id: name, name, lat, lng, approximate }], {
        center: [lat, lng],
        zoom: 15,
        fit: false,
      }) as any;
      setReady(true);
    }).catch(() => {});

    return () => {
      alive = false;
      try { instance?.map.remove(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-cream-300
                    h-80 bg-ink-100">
      <div ref={el} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-coal-400 text-sm">
          <iconify-icon icon="lucide:map" className="text-2xl animate-pulse" />
        </div>
      )}
      {approximate && (
        <p className="absolute bottom-2 left-2 right-2 z-[400] px-3 py-1.5 rounded-lg
                      bg-amber-100/95 text-amber-900 text-[11px] font-semibold">
          Vị trí ước lượng theo quận — xem trước khu vực, chưa phải toạ độ chính xác
          của dự án.
        </p>
      )}
    </div>
  );
}