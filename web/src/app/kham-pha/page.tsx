'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, fmtPrice, type AdminUnit, type MapProject, type ListingCard } from '@/lib/api';
import { loadLeaflet } from '@/lib/map';
import { toggleCompare, inCompare } from '@/lib/compare';

// ==========================================
// SVG Icons (Pixel-perfect & zero-dependency)
// ==========================================
const Icons = {
  Search: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Close: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  ChevronDown: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  ChevronLeft: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  ChevronRight: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  MoreHorizontal: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  ),
  Bell: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Star: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Share: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  ),
  MapPin: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Bed: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v9" />
    </svg>
  ),
  Bath: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-1C4.7 2.5 4 3.2 4 4v2" />
      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1Z" />
      <path d="M7 19v2" />
      <path d="M17 19v2" />
    </svg>
  ),
  Armchair: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
      <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z" />
      <path d="M5 18v2" />
      <path d="M19 18v2" />
    </svg>
  ),
  Area: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Heart: ({ filled = false, className = "w-4 h-4" }: { filled?: boolean; className?: string }) => (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  Pencil: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  ),
  Plus: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
  Minus: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
    </svg>
  ),
  Compass360: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" strokeDasharray="2 2" />
      <path d="M7 12h10" />
    </svg>
  ),
  Logo: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h7a4 4 0 0 1 4 4v2H9v-2H6v8h3v-2h6v4a4 4 0 0 1-4 4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm14 7h2v2h-2v-2z" />
    </svg>
  ),
  Maximize2: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  Minimize2: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  Scale: ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  )
};

// ==========================================
// Item Type
// ==========================================
/* Nền thay ảnh: gradient theo màu dự án (hue lưu sẵn trong dữ liệu) kèm
 * tên dự án — đúng quy tắc: tin không có ảnh thì KHÔNG dùng ảnh minh hoạ,
 * vì người xem sẽ tưởng đó là căn thật. */
function nenThayAnh(hue: number): React.CSSProperties {
  return {
    backgroundImage:
      `linear-gradient(135deg, hsl(${hue} 60% 50%), hsl(${(hue + 42) % 360} 55% 34%))`,
  };
}

interface PropertyItem {
  id: string;
  /* slug tin + slug quận — bắt buộc để mở /chi-tiet và đưa vào giỏ so sánh.
     Trước đây dùng nhầm id làm slug và TÊN quận làm slug quận, nên mọi tin
     bấm từ trang này đều dẫn tới trang lỗi. */
  slug: string;
  districtSlug: string;
  ward: string | null;

  title: string;
  projectName?: string;
  priceFormatted: string;
  priceSub: string;
  priceRaw: number;
  type: 'rent' | 'sell';
  category: string;

  address: string;
  district: string;

  /* Ba trường này trước đây gán số bịa. Dữ liệu không có phòng khách, và
     bathrooms luôn null, nên phải cho phép null để ẩn thay vì hiện số ảo. */
  beds: number | null;
  baths: number | null;
  areaNum: number | null;
  area: string;

  images: string[];
  /** số màu 0–360 để vẽ nền gradient khi tin không có ảnh thật */
  hue: number;
  description: string;
  fullDescription: string;

  /* null = chưa định vị được. KHÔNG tự sinh toạ độ: trước đây đặt theo
     công thức lưới nên mọi tin đều có chấm, đúng cái lỗi "dồn ở tâm quận". */
  lat: number | null;
  lng: number | null;
  /** toạ độ chỉ là tâm quận, chưa phải vị trí thật của dự án */
  approxCoord: boolean;

  clusterCount?: number;
}

export default function KhamPhaPage() {
  const [districts, setDistricts] = useState<AdminUnit[]>([]);
  const [projects, setProjects] = useState<MapProject[]>([]);
  const [featuredListings, setFeaturedListings] = useState<ListingCard[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [mapEmpty, setMapEmpty] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [activeTab, setActiveTab] = useState<'Rent' | 'Buy' | 'About' | 'Sell' | 'Contact'>('Rent');
  const [searchQuery, setSearchQuery] = useState('TP. Hồ Chí Minh, Ba Son, Quận 1');
  const [isFramed, setIsFramed] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [copiedToast, setCopiedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Đã sao chép liên kết vào bộ nhớ tạm!');

  // Filter states
  const [activeType, setActiveType] = useState<'Apartment' | 'House' | null>('Apartment');
  const [activePrice, setActivePrice] = useState<string | null>('15 - 50 tr/tháng');
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // Modals
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polygonRef = useRef<any>(null);

  /* KHÔNG có mảng tin mẫu nữa.
   * Trước đây khi dữ liệu thật rỗng, trang hiện 4 tin "curated" viết tay —
   * giá, đánh giá, ảnh Unsplash, toạ độ gõ tay, mô tả bịa. Đó là tin giả
   * hiện ngay trên trang chính của hệ thống.
   * Nay rỗng thì hiện thông báo "chưa có tin", thà nói thật còn hơn bịa. */

  /* Nạp dữ liệu thật và chuyển sang PropertyItem.
   *
   * NGUYÊN TẮC: không điền số khi thiếu dữ liệu. Trước đây mọi trường đều có
   * "giá trị mặc định" (2 WC, 1 phòng khách, 75 m², 4.9 điểm…) nên tin thiếu
   * thông tin vẫn hiện ra như thật. Nay thiếu thì để trống, hiển thị bằng dấu
   * gạch ngang và không chấm lên bản đồ. */
  useEffect(() => {
    let alive = true;

    Promise.all([
      api.adminUnits().catch(() => null),
      api.mapProjects().catch(() => null),
      api.featured(48).catch(() => null),
    ]).then(([unitsRes, mapRes, featRes]) => {
      if (!alive) return;
      if (unitsRes?.districts) setDistricts(unitsRes.districts);
      if (mapRes?.data) setProjects(mapRes.data);

      const list = featRes?.data ?? [];

      const mapped: PropertyItem[] = list.map((item, idx) => {
        /* fmtPrice là bộ định dạng chuẩn của dự án — dùng lại thay vì tự
           chia đơn vị, vì tự chia từng chỗ thì dễ lệch với phần còn lại. */
        const gia = fmtPrice(item.price, item.price_unit, item.type);

        /* ghép các tin cùng dự án để đếm số tin trong góc chấm — số liệu thật,
           trước đây gán cứng "3" cho tin thứ ba. */
        const cungDuAn = list.filter((x) => x.project_name && x.project_name === item.project_name).length;

        const dia = item.area != null ? `${item.area} m²` : '—';
        const tinh = [item.street_name, item.ward_name, item.district_name]
          .filter(Boolean)
          .join(', ');

        return {
          id: item.id,
          slug: item.slug,
          districtSlug: item.district_slug || '',
          ward: item.ward_name ?? null,

          title: item.title,
          projectName: item.project_name ?? undefined,
          priceFormatted: gia,
          priceSub: item.type === 'rent' ? '/ tháng' : '',
          priceRaw: item.price,
          type: item.type,
          category: item.category === 'chung-cu' ? 'Chung cư' : item.category === 'nha-pho' ? 'Nhà phố' : item.category || 'Bất động sản',

          address: tinh || 'Chưa có địa chỉ trong dữ liệu',
          district: item.district_name || 'TP.HCM',

          beds: item.bedrooms ?? null,
          baths: item.bathrooms ?? null,
          areaNum: item.area ?? null,
          area: dia,

          /* Chỉ ảnh thật. Không đệm ảnh Unsplash: tin là thật thì ảnh minh hoạ
             là nói dối. Không có ảnh thì dùng nền gradient theo màu dự án. */
          images: item.images && item.images.length > 0 ? item.images : [],
          hue: item.project_hue ?? ((idx * 47) % 360),

          /* Mô tả bịa trước đây là title cắt cụt + "…". Dùng đúng tiêu đề tin. */
          description: item.title,
          fullDescription: item.title,

          /* Toạ độ của DỰ ÁN, không phải của căn — đây là toạ độ tốt nhất mà
             dữ liệu có. approximate = true nghĩa là mới là tâm quận. */
          lat: item.project_lat ?? null,
          lng: item.project_lng ?? null,
          approxCoord: item.project_lat_approximate !== false,

          clusterCount: cungDuAn > 1 ? cungDuAn : undefined,
        };
      });

      setFeaturedListings(list);
      setProperties(mapped);
      /* chọn tin đầu tiên CÓ toạ độ để bản đồ không trống lúc mở */
      setSelectedProperty(mapped.find((x) => x.lat != null) ?? mapped[0] ?? null);
    });

    return () => { alive = false; };
  }, []);

  // Leaflet initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;

    loadLeaflet().then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Center around Ba Son, Saigon River, District 1
        const map = L.map(mapContainerRef.current, {
          center: [10.7850, 106.7180],
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        });

        // CartoDB Positron monochrome light tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);

        // Organic curve boundary polygon enclosing District 1, Ba Son, Thu Thiem
        const saigonBoundary: [number, number][] = [
          [10.8080, 106.7050], // Bình Thạnh
          [10.8160, 106.7320], // Thảo Điền
          [10.7950, 106.7550], // An Phú / Mai Chí Thọ
          [10.7720, 106.7480], // Thủ Thiêm Nam
          [10.7580, 106.7260], // Bến Vân Đồn / Cầu Thủ Thiêm 4
          [10.7520, 106.6960], // Quận 4 / Kênh Tẻ
          [10.7650, 106.6820], // Bến Thành
          [10.7820, 106.6850], // Tân Định
          [10.7950, 106.6900], // Đa Kao
        ];

        const polygon = L.polygon(saigonBoundary, {
          color: '#18181b',
          weight: 2,
          fillColor: '#18181b',
          fillOpacity: 0.04,
          smoothFactor: 2.5,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        polygonRef.current = polygon;
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clean existing markers
      Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
      markersRef.current = {};

      // Draw custom price markers
      const renderList = properties;

      /* KHÔNG chấm tin chưa định vị được.
       * Trong 48 tin featured chỉ 10 tin thuộc dự án đã có toạ độ, 6 tin có
       * toạ độ chính xác. Trước đây vì tự sinh toạ độ nên cả 48 tin đều có
       * chấm — người xem tưởng vị trí từng căn là thật. */
      const coToaDo = renderList.filter((x) => x.lat != null && x.lng != null);
      setMapEmpty(renderList.length > 0 && coToaDo.length === 0);

      coToaDo.forEach((item) => {
        const isSelected = selectedProperty?.id === item.id;

        const html = `
          <div class="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 select-none ${
            isSelected ? 'scale-110 z-50' : 'hover:scale-105 z-20'
          }">
            <div class="px-3.5 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.12)] border transition-all duration-200 flex items-center gap-1 whitespace-nowrap ${
              isSelected
                ? 'bg-zinc-950 text-white border-zinc-950 shadow-[0_6px_20px_rgba(0,0,0,0.25)]'
                : 'bg-white text-zinc-900 border-zinc-200/80 hover:border-zinc-400'
            } ${
              /* Viền đứt = toạ độ mới là tâm quận. Người xem phải phân biệt được
                 chấm chính xác với chấm ước lượng, không gộp chung. */
              item.approxCoord ? 'border-dashed' : ''
            }">
              <span class="text-xs font-bold tracking-tight">${item.priceFormatted}</span>
              ${item.priceSub ? `<span class="text-[10px] font-normal opacity-70">${item.priceSub}</span>` : ''}
            </div>
            ${
              item.clusterCount
                ? `
                <div class="w-5 h-5 -mt-1.5 rounded-full bg-zinc-950 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white shadow-md">
                  ${item.clusterCount}
                </div>
              `
                : `
                <div class="w-2.5 h-2.5 -mt-1 rounded-full ${
                  isSelected ? 'bg-zinc-950 ring-2 ring-white' : 'bg-zinc-900 ring-2 ring-white'
                } shadow-xs"></div>
              `
            }
          </div>
        `;

        const icon = L.divIcon({
          className: 'custom-price-pin',
          html: html,
          iconSize: [90, 42],
          iconAnchor: [45, 38],
        });

        const marker = L.marker([item.lat, item.lng], { icon }).addTo(map);

        if (item.approxCoord) {
          marker.bindTooltip('Vị trí tạm — theo tâm quận, chưa phải toạ độ chính xác', {
            direction: 'top',
            offset: [0, -34],
          });
        }

        marker.on('click', () => {
          setSelectedProperty(item);
          setCurrentImageIndex(0);
        });

        markersRef.current[item.id] = marker;
      });
    });

    return () => { isMounted = false; };
  }, [properties, selectedProperty]);

  const toggleFavorite = (e: React.MouseEvent, propId: string) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [propId]: !prev[propId] }));
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setToastMessage('Đã sao chép liên kết vào bộ nhớ tạm!');
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2200);
    }
  };

  /* KHÔNG ghi `|| null`: vì `properties[0]` đã mang kiểu PropertyItem nên
   * TypeScript coi nhánh đó là chết và suy ra activeProp không bao giờ null —
   * sai lệch với lúc chạy, khi danh sách còn rỗng thì nó null thật. */
  const activeProp = selectedProperty || properties[0];
  const anhHienThi = activeProp
    ? activeProp.images[currentImageIndex] ?? activeProp.images[0] ?? null
    : null;

  /* Chặn lần vẽ đầu, lúc dữ liệu chưa về. Không có gì để hiện thì nói thật
   * là đang tải, thay vì đụng vào activeProp.images và trắng trang. */
  if (!activeProp) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 px-6">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin" />
          <p className="text-sm font-semibold text-zinc-800">Đang tải tin đăng…</p>
          <p className="text-xs text-zinc-500 mt-1">
            Trang chỉ hiện tin có thật trong hệ thống — không có dữ liệu mẫu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center transition-colors duration-300 font-sans ${
      isFramed 
        ? 'bg-gradient-to-tr from-[#cac4d2] via-[#dedae7] to-[#cac4d4] p-2 sm:p-5 md:p-8 lg:p-12' 
        : 'bg-white p-0'
    }`}>
      
      {/* Top Banner Notice for Map3D Integration */}
      <div className="w-full max-w-[1440px] mb-3 flex items-center justify-between px-4 py-2 bg-zinc-900/90 backdrop-blur-md rounded-2xl text-white text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">Bản thử nghiệm giao diện Estates cho SGREALTY / Map3D</span>
          <span className="hidden md:inline text-zinc-400">· Tương tác Split-Screen & Marker giá trực quan</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/ban-do" className="text-zinc-300 hover:text-white underline">
            Về bản đồ cũ (/ban-do)
          </Link>
          <button
            onClick={() => setIsFramed(!isFramed)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
          >
            {isFramed ? <Icons.Maximize2 /> : <Icons.Minimize2 />}
            <span>{isFramed ? 'Toàn màn hình' : 'Khung Mockup'}</span>
          </button>
        </div>
      </div>

      {/* Main Estates Web Container */}
      <div 
        className={`w-full max-w-[1440px] bg-white transition-all duration-300 flex flex-col ${
          isFramed
            ? 'rounded-[32px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.22)] border border-white/90 overflow-hidden'
            : 'min-h-[calc(100vh-60px)] rounded-none shadow-none border-none'
        }`}
      >
        {/* Header */}
        <header className="w-full bg-white px-6 md:px-8 py-4 flex items-center justify-between border-b border-zinc-100/90 select-none z-30">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shadow-sm">
              <Icons.Logo />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">
              Estates
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-medium ml-1">
              Sài Gòn
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {(['About', 'Buy', 'Sell', 'Rent', 'Contact'] as const).map((tab) => {
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative py-1 text-sm font-semibold transition-colors cursor-pointer ${
                    isActive ? 'text-zinc-950 font-bold' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {tab === 'Rent' ? 'Thuê' : tab === 'Buy' ? 'Mua' : tab === 'Sell' ? 'Bán' : tab === 'Contact' ? 'Liên Hệ' : 'Về Chúng Tôi'}
                  {isActive && (
                    <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-black rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right User Profile */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 cursor-pointer p-1 rounded-full hover:bg-zinc-50 transition-colors">
              <span className="text-sm font-semibold text-zinc-900">Khách</span>
              {/* Vòng tròn chữ cái thay cho ảnh chụp mặt người thật — trước đây
                  lấy ảnh Unsplash làm avatar, tức gán danh tính cho một người
                  không liên quan. */}
              <span
                aria-hidden
                className="w-8 h-8 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-zinc-100"
              >
                K
              </span>
            </div>
            <button className="relative p-1.5 text-zinc-800 hover:bg-zinc-100 rounded-full cursor-pointer">
              <Icons.Bell />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-black rounded-full" />
            </button>
          </div>
        </header>

        {/* Split Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[700px] bg-white">
          
          {/* ========================================================
              LEFT COLUMN: Leaflet Map + Floating Filter Chips (58%)
             ======================================================== */}
          <div className="lg:col-span-7 relative h-[480px] lg:h-auto min-h-[500px] border-b lg:border-b-0 lg:border-r border-zinc-100 overflow-hidden bg-[#f1f3f5]">
            {/* Real Map Canvas */}
            <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />
      {mapEmpty && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none px-6">
          <div className="bg-white/95 backdrop-blur-md rounded-xl px-5 py-4 text-center shadow-lg max-w-xs">
            <p className="text-sm font-semibold text-zinc-900">Chưa có tin nào định vị được</p>
            <p className="text-xs text-zinc-500 mt-1">
              Dữ liệu hiện chưa có toạ độ chính xác cho các tin này, nên không
              đặt chấm lên bản đồ — tránh báo sai vị trí.
            </p>
          </div>
        </div>
      )}

            {/* Floating Top Filter Pills Row */}
            <div className="absolute top-5 left-5 right-5 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
              {/* Type Chip */}
              {activeType && (
                <div className="flex items-center gap-1.5 bg-zinc-950 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-md">
                  <span>Loại: {activeType === 'Apartment' ? 'Căn hộ chung cư' : 'Nhà phố'}</span>
                  <button onClick={() => setActiveType(null)} className="ml-1 cursor-pointer">
                    <Icons.Close />
                  </button>
                </div>
              )}

              {/* Price Chip */}
              {activePrice && (
                <div className="flex items-center gap-1.5 bg-zinc-950 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-md">
                  <span>Giá: {activePrice}</span>
                  <button onClick={() => setActivePrice(null)} className="ml-1 cursor-pointer">
                    <Icons.Close />
                  </button>
                </div>
              )}

              {/* District Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowDistrictDropdown(!showDistrictDropdown);
                    setShowPriceDropdown(false);
                    setShowMoreMenu(false);
                  }}
                  className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-zinc-700 hover:text-zinc-900 text-xs font-semibold px-3.5 py-2 rounded-full shadow-sm border border-zinc-200/80 hover:bg-white transition-all cursor-pointer"
                >
                  <span>Khu vực</span>
                  <Icons.ChevronDown />
                </button>

                {showDistrictDropdown && (
                  <div className="absolute left-0 mt-2 w-48 max-h-60 overflow-y-auto bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1.5 font-semibold text-zinc-400 text-[10px] uppercase">Quận / Huyện</div>
                    {['Quận 1', 'Quận 2 (Thủ Đức)', 'Bình Thạnh', 'Quận 7 (Phú Mỹ Hưng)', 'Quận 4', 'Quận 3'].map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setSearchQuery(`TP. Hồ Chí Minh, ${d}`);
                          setShowDistrictDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Floor / Price Select */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowPriceDropdown(!showPriceDropdown);
                    setShowDistrictDropdown(false);
                    setShowMoreMenu(false);
                  }}
                  className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-zinc-700 hover:text-zinc-900 text-xs font-semibold px-3.5 py-2 rounded-full shadow-sm border border-zinc-200/80 hover:bg-white transition-all cursor-pointer"
                >
                  <span>Khoảng tầng</span>
                  <Icons.ChevronDown />
                </button>

                {showPriceDropdown && (
                  <div className="absolute left-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1.5 font-semibold text-zinc-400 text-[10px] uppercase">Vị trí tầng</div>
                    {['Tầng thấp (1–5)', 'Tầng trung (6–18)', 'Tầng cao (19+)', 'Penthouse / Sky Villa'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setShowPriceDropdown(false)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* More amenities */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMoreMenu(!showMoreMenu);
                    setShowDistrictDropdown(false);
                    setShowPriceDropdown(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white/95 backdrop-blur-md text-zinc-700 hover:text-zinc-900 rounded-full shadow-sm border border-zinc-200/80 hover:bg-white transition-all cursor-pointer"
                  title="Thêm tiện ích"
                >
                  <Icons.MoreHorizontal />
                </button>

                {showMoreMenu && (
                  <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1.5 font-semibold text-zinc-400 text-[10px] uppercase">Tiện ích chọn thêm</div>
                    {['Sổ hồng riêng', 'View sông Sài Gòn', 'Gần ga Metro', 'Hồ bơi tràn bờ', 'Chỗ đậu ô tô'].map((item) => (
                      <label key={item} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer">
                        <input type="checkbox" defaultChecked={item.includes('sông') || item.includes('Sổ')} className="rounded accent-zinc-900" />
                        <span className="text-zinc-700">{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Region Search Pill (matching "France, Nice" input) */}
            <div className="absolute top-18 left-5 z-20 pointer-events-auto">
              <div className="bg-white rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.08)] border border-zinc-100 px-4 py-2 flex items-center gap-3 w-64 md:w-80 transition-all focus-within:ring-2 focus-within:ring-zinc-900/20">
                <Icons.Search className="text-zinc-400 shrink-0" />
                <div className="flex flex-col flex-1 leading-tight">
                  <span className="text-[10px] font-medium text-zinc-400">Khu vực tìm kiếm</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Sài Gòn, Quận 1, Thủ Thiêm..."
                    className="text-xs font-bold text-zinc-900 bg-transparent outline-none p-0 border-none w-full"
                  />
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="w-5 h-5 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer">
                    <Icons.Close className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Left Floating Map Controls */}
            <div className="absolute bottom-6 left-5 z-20 flex flex-col items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setIsDrawing(!isDrawing)}
                className={`w-9 h-9 rounded-full shadow-md flex items-center justify-center transition-all cursor-pointer ${
                  isDrawing ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-700 hover:text-black border border-zinc-200/70'
                }`}
                title="Khoanh vùng tìm kiếm BĐS"
              >
                <Icons.Pencil />
              </button>
              <button
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="w-9 h-9 rounded-full bg-white text-zinc-700 hover:text-black shadow-md border border-zinc-200/70 flex items-center justify-center cursor-pointer"
                title="Phóng to"
              >
                <Icons.Plus />
              </button>
              <button
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="w-9 h-9 rounded-full bg-white text-zinc-700 hover:text-black shadow-md border border-zinc-200/70 flex items-center justify-center cursor-pointer"
                title="Thu nhỏ"
              >
                <Icons.Minus />
              </button>
            </div>

            {/* Hint toast when drawing mode is on */}
            {isDrawing && (
              <div className="absolute bottom-6 left-20 z-20 bg-zinc-900 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg border border-zinc-800 flex items-center gap-2">
                <span>Đang bật chế độ khoanh vùng Thủ Thiêm - Ba Son</span>
                <button onClick={() => setIsDrawing(false)} className="text-zinc-400 hover:text-white underline text-[11px] ml-1">
                  Đóng
                </button>
              </div>
            )}
          </div>

          {/* ========================================================
              RIGHT COLUMN: Master Detail Property + 3 Mini Cards (42%)
             ======================================================== */}
          <div className="lg:col-span-5 flex flex-col justify-between p-5 lg:p-6 bg-white gap-5">
            
            {/* Upper Detailed Property Card */}
            <div className="bg-white rounded-[24px] p-5 shadow-xs border border-zinc-100">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                
                {/* Left Side: Photo Carousel */}
                <div className="md:col-span-5 relative group">
                  <div className="relative w-full aspect-[4/3] rounded-[20px] overflow-hidden bg-zinc-100">
                    {anhHienThi ? (
                      <img
                        src={anhHienThi}
                        alt={activeProp.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-4 text-center"
                        style={nenThayAnh(activeProp.hue)}
                      >
                        <Icons.Area className="w-7 h-7 text-white/70" />
                        <span className="text-xs font-bold text-white">
                          {activeProp.projectName || activeProp.district}
                        </span>
                        <span className="text-[10px] text-white/70">Tin chưa có ảnh</span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/15 pointer-events-none" />

                    {/* Trước đây là huy hiệu sao + điểm "4.9". Dữ liệu KHÔNG có
                        trường đánh giá — điểm đó được sinh bằng công thức
                        4.8 + (idx % 3) * 0.1. Thay bằng loại hình nhà đất, thật. */}
                    <div className="absolute top-3.5 left-3.5 z-10">
                      <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm text-zinc-900 text-xs font-bold">
                        <span>{activeProp.category}</span>
                      </div>
                    </div>

                    {/* 360 Tour Button */}
                    <div className="absolute top-3.5 right-3.5 z-10">
                      <button
                        onClick={() => setIsTourOpen(true)}
                        className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md text-zinc-800 hover:text-black shadow-sm flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                        title="Xem 360° VR Tour"
                      >
                        <Icons.Compass360 />
                      </button>
                    </div>

                    {/* Chỉ hiện nút cuộn khi thật sự có nhiều ảnh. Trước đây
                        luôn hiện, và `% 0` cho ra NaN khi tin không có ảnh. */}
                    {activeProp.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(
                              (prev) => (prev - 1 + activeProp.images.length) % activeProp.images.length,
                            );
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 hover:bg-white text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          <Icons.ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) => (prev + 1) % activeProp.images.length);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 hover:bg-white text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          <Icons.ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {/* Carousel Indicator Dots */}
                    <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
                      {activeProp.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`transition-all cursor-pointer ${
                            currentImageIndex === idx
                              ? 'w-2.5 h-2.5 rounded-full border-2 border-white bg-transparent'
                              : 'w-1.5 h-1.5 rounded-full bg-white/70'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Information & Actions */}
                <div className="md:col-span-7 flex flex-col justify-between py-1">
                  <div>
                    {/* Header Label & Share */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                        {activeProp.projectName || 'Dự án nổi bật'}
                      </span>
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-medium cursor-pointer"
                      >
                        <span>Chia sẻ</span>
                        <Icons.Share />
                      </button>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-extrabold text-zinc-950 tracking-tight leading-snug mb-1">
                      {activeProp.title}
                    </h2>

                    {/* Address */}
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-3.5">
                      <Icons.MapPin className="text-zinc-400 shrink-0" />
                      <span className="truncate">{activeProp.address}</span>
                    </div>

                    {/* Amenities Pill Container */}
                    <div className="inline-flex items-center gap-4 bg-zinc-50 border border-zinc-100 rounded-xl px-3.5 py-2 mb-3.5 text-xs font-semibold text-zinc-700">
                      {/* Phòng khách bị bỏ hẳn: dữ liệu không có trường này.
                          PN/WC chỉ hiện khi dữ liệu thật sự có, thay vì gán
                          số 2 / 1 cho mọi tin. */}
                      {activeProp.beds != null && (
                        <div className="flex items-center gap-1.5">
                          <Icons.Bed className="text-zinc-400" />
                          <span>{activeProp.beds} PN</span>
                        </div>
                      )}
                      {activeProp.baths != null && (
                        <div className="flex items-center gap-1.5">
                          <Icons.Bath className="text-zinc-400" />
                          <span>{activeProp.baths} WC</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Icons.Area className="text-zinc-400" />
                        <span className="whitespace-nowrap">{activeProp.area}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                      {isExpanded ? activeProp.fullDescription : activeProp.description}{' '}
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-teal-600 font-semibold hover:underline cursor-pointer"
                      >
                        {isExpanded ? 'thu gọn' : 'xem chi tiết'}
                      </button>
                    </p>
                  </div>

                  {/* Bottom Price & CTA */}
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-zinc-400 font-medium">Giá niêm yết:</span>
                      <span className="text-2xl font-black text-zinc-950 tracking-tight">{activeProp.priceFormatted}</span>
                      <span className="text-xs text-zinc-400 font-normal">{activeProp.priceSub}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsContactOpen(true)}
                        className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-sm transition-all cursor-pointer"
                      >
                        Hiện số liên hệ
                      </button>

                      <button
                        onClick={() => {
                          const compItem = {
                            id: activeProp.id,
                            slug: activeProp.slug,
                            d: activeProp.districtSlug,
                            title: activeProp.title,
                            price: activeProp.priceRaw,
                            type: activeProp.type,
                            image: activeProp.images[0] || null,
                            area: activeProp.areaNum,
                            bedrooms: activeProp.beds,
                            district_name: activeProp.district,
                            ward_name: activeProp.ward,
                          };
                          const res = toggleCompare(compItem);
                          if (res.full) {
                            setToastMessage('Giỏ so sánh đã đầy (tối đa 5 tin)!');
                          } else if (res.ok) {
                            setToastMessage(inCompare(activeProp.id) ? 'Đã thêm vào giỏ so sánh!' : 'Đã xoá khỏi so sánh!');
                          }
                          setCopiedToast(true);
                          setTimeout(() => setCopiedToast(false), 2200);
                        }}
                        className={`h-9 px-3 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          inCompare(activeProp.id)
                            ? 'bg-sky-50 text-sky-700 border-sky-300'
                            : 'border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-50'
                        }`}
                        title="Thêm/Xoá khỏi giỏ so sánh"
                      >
                        <Icons.Scale className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{inCompare(activeProp.id) ? 'Đang so sánh' : 'So sánh'}</span>
                      </button>

                      <Link
                        href={`/tim-kiem/?q=${encodeURIComponent(activeProp.projectName || activeProp.title)}`}
                        target="_blank"
                        className="w-9 h-9 rounded-full border border-zinc-200 text-zinc-600 hover:text-black flex items-center justify-center cursor-pointer transition-colors"
                        title="Tìm các tin tương tự"
                      >
                        <Icons.MoreHorizontal />
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Lower 3 Listing Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 select-none">
              {properties.slice(0, 3).map((item) => {
                const isSelected = activeProp.id === item.id;
                const isFav = favorites[item.id];

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedProperty(item);
                      setCurrentImageIndex(0);
                    }}
                    className={`group bg-white rounded-2xl p-2.5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'ring-2 ring-zinc-950 shadow-md'
                        : 'border border-zinc-100 hover:border-zinc-300 shadow-xs'
                    }`}
                  >
                    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-zinc-100 mb-2.5">
                      {item.images[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center px-3 text-center"
                          style={nenThayAnh(item.hue)}
                        >
                          <span className="text-[10px] font-bold text-white leading-tight">
                            {item.projectName || item.district}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-extrabold text-zinc-950">{item.priceFormatted}</span>
                        <span className="text-[11px] font-normal text-zinc-400">{item.priceSub}</span>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(e, item.id)}
                        className="p-1 text-zinc-300 hover:text-rose-500 cursor-pointer"
                      >
                        <Icons.Heart filled={isFav} className={isFav ? "text-rose-500" : ""} />
                      </button>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-medium truncate mb-2.5">
                      {item.projectName || item.district}
                    </div>

                    <div className="flex items-center gap-3 pt-1 border-t border-zinc-100 text-[11px] text-zinc-600 font-semibold">
                      <div className="flex items-center gap-1">
                        <Icons.Bed className="text-zinc-400" />
                        <span>{item.beds}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icons.Bath className="text-zinc-400" />
                        <span>{item.baths}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icons.Area className="text-zinc-400" />
                        <span>{item.area}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>

      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Contact Modal */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="w-10 h-10 rounded-full bg-zinc-900 text-white text-sm font-bold flex items-center justify-center ring-2 ring-zinc-100"
                >
                  SG
                </span>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900">Tư vấn SGREALTY</h4>
                  <p className="text-xs text-zinc-400">Gửi yêu cầu, đội ngũ sẽ liên hệ lại</p>
                </div>
              </div>
              <button onClick={() => setIsContactOpen(false)} className="p-1 text-zinc-400 hover:text-black">
                <Icons.Close />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-5">
              <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block mb-0.5">Hotline / Zalo hỗ trợ</span>
                  {/* Trước đây là "0903 123 456" kèm href="tel:0903123456" — một
                      số di động đúng định dạng Việt Nam, bấm "Gọi ngay" là gọi
                      cho người thật. Toàn site giữ số ở dạng 1900 xxx xxx vì
                      văn phòng chưa mở; trang này cũng phải theo. */}
                  <span className="font-bold text-zinc-900 text-sm">1900 xxx xxx</span>
                </div>
                <a
                  href="/lien-he/"
                  className="bg-black text-white px-3 py-1.5 rounded-full font-semibold hover:bg-zinc-800"
                >
                  Gửi yêu cầu
                </a>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl">
                <span className="text-zinc-400 block mb-0.5">Tin đăng quan tâm</span>
                <p className="font-semibold text-zinc-800 truncate">{activeProp.title}</p>
              </div>
            </div>

            <button
              onClick={() => setIsContactOpen(false)}
              className="w-full bg-black text-white text-xs font-bold py-3 rounded-full hover:bg-zinc-800 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* 360 Tour Modal */}
      {isTourOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-zinc-950 text-white rounded-3xl max-w-3xl w-full overflow-hidden border border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.Compass360 className="text-teal-400" />
                <span className="font-bold text-sm">360° Virtual Tour • {activeProp.title}</span>
              </div>
              <button onClick={() => setIsTourOpen(false)} className="text-zinc-400 hover:text-white">
                <Icons.Close />
              </button>
            </div>
            <div className="relative aspect-video bg-black">
              {activeProp.images[0] ? (
                <img src={activeProp.images[0]} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={nenThayAnh(activeProp.hue)}
                >
                  <span className="text-sm font-bold text-white">
                    {activeProp.projectName || activeProp.district}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs text-white border border-white/20">
                  Kéo chuột để xoay toàn cảnh 360° căn hộ
                </div>
              </div>
            </div>
            <div className="p-4 bg-zinc-900 flex justify-end">
              <button onClick={() => setIsTourOpen(false)} className="bg-white text-zinc-950 text-xs font-bold px-5 py-2 rounded-full">
                Đóng Tour
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
