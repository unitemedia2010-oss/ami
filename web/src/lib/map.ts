/**
 * =============================================================================
 *  Bản đồ dự án / căn hộ — Leaflet nạp từ CDN.
 *
 *  Vì sao không dùng react-leaflet:
 *    • Nó là dependency, cần cài npm và tăng bundle JS.
 *    • Trang đã là static export; Leaflet chạy phía client vốn vậy.
 *  Leaflet tải bằng <script> là đủ, không cần gói nào.
 *
 *  Về toạ độ — đọc kỹ trước khi dùng thật:
 *    Mock server đặt toạ độ = TÂM QUẬN, KHÔNG phải vị trí thật của dự án.
 *    Mình không tự bịa toạ độ dự án: sai là đưa người mua đến chỗ không có
 *    thật, nguy cơ pháp lý với chủ đầu tư. Vì vậy:
 *      • toạ độ thật phải lấy từ Google Maps và nhập trong trang quản trị,
 *      • giao diện HIỂN THỊ rõ "vị trí ước lượng theo quận" khi thiếu toạ độ
 *        chính xác, để không ai hiểu nhầm là vị trí thật.
 * ============================================================================= */

declare global {
  interface Window {
    L?: any;
    __mapReady?: boolean;
  }
}

export const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
export const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string | null;
  href?: string;
  price?: string | null;
  /** true = toạ độ chỉ là tâm quận, không phải vị trí thật */
  approximate?: boolean;
}

/** Nạp Leaflet một lần, dùng chung cho mọi bản đồ trong trang */
export function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.L) return Promise.resolve(window.L);

  return new Promise((resolve, reject) => {
    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    // JS
    const existing = document.getElementById('leaflet-js') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.id = 'leaflet-js';
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/** Marker màu thương hiệu: gradient vàng → cam → đỏ, viền trắng */
export const PIN_ICON = (label: string, active = false) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#FBBF24"/><stop offset="55%" stop-color="#F97316"/><stop offset="100%" stop-color="#E11D48"/>
</linearGradient></defs>
<path d="M17 1C8.2 1 1 8.2 1 17c0 11.5 16 26 16 26s16-14.5 16-26C33 8.2 25.8 1 17 1z"
 fill="${active ? '#9F1239' : 'url(#g)'}" stroke="#fff" stroke-width="2.5"/>
<circle cx="17" cy="17" r="6.5" fill="#fff" opacity=".95"/>
<text x="17" y="20.5" font-family="Segoe UI,sans-serif" font-size="9" font-weight="800"
 fill="${active ? '#9F1239' : '#E11D48'}" text-anchor="middle">${label}</text>
</svg>`)}`;

/** Marker nhỏ cho chế độ nhiều điểm */
export const DOT_ICON = (active = false) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
<circle cx="13" cy="13" r="11" fill="${active ? '#E11D48' : '#F97316'}" stroke="#fff" stroke-width="2.5"/>
<circle cx="13" cy="13" r="4" fill="#fff"/>
</svg>`)}`;

/** Tạo bản đồ đã cấu hình xong */
export function createMap(el: HTMLElement, points: MapPoint[], opts: {
  center?: [number, number];
  zoom?: number;
  fit?: boolean;
  onSelect?: (p: MapPoint) => void;
} = {}) {
  const L = window.L!;
  const center = opts.center ?? [10.7769, 106.7009];

  const map = L.map(el, {
    center,
    zoom: opts.zoom ?? 12,
    zoomControl: true,
    scrollWheelZoom: false,      // không nuốt cuộn trang khi rê chuột lên bản đồ
    attributionControl: true,
  });

  // Tile OpenStreetMap — miễn phí, không cần API key
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Cuộn chuột chỉ hoạt động sau khi bấm vào bản đồ — tránh "mất" cuộn trang
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());

  const group: any[] = [];

  for (const p of points) {
    const icon = L.icon({
      iconUrl: DOT_ICON(),
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14],
    });

    const marker = L.marker([p.lat, p.lng], { icon, title: p.name }).addTo(map);

    const priceRow = p.price
      ? `<div style="font-weight:800;color:#E11D48;font-size:13px;margin-top:4px">${p.price}</div>`
      : '';
    const approxRow = p.approximate
      ? `<div style="font-size:11px;color:#B45309;background:#FEF3C7;border-radius:6px;
                  padding:3px 6px;margin-top:6px;display:inline-block">
           Vị trí ước lượng theo quận</div>`
      : '';
    const linkRow = p.href
      ? `<a href="${p.href}" style="display:inline-block;margin-top:8px;font-size:12px;
                font-weight:700;color:#1E5A96">Xem tin →</a>`
      : '';

    marker.bindPopup(
      `<div style="min-width:180px">
         <div style="font-weight:800;font-size:14px;color:#292524;line-height:1.3">${p.name}</div>
         ${p.address ? `<div style="font-size:11.5px;color:#78716C;margin-top:2px">${p.address}</div>` : ''}
         ${priceRow}${approxRow}${linkRow}
       </div>`,
    );

    marker.on('click', () => opts.onSelect?.(p));
    group.push(marker);
  }

  if (opts.fit !== false && group.length) {
    const bounds = L.latLngBounds(group.map((m) => m.getLatLng()));
    map.fitBounds(bounds, { padding: [46, 46], maxZoom: 15 });
  }

  return { map, group };
}