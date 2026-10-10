'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProjectCard, ListingCardSkeleton, type Project } from '@/components/ListingCard';
import MapView from '@/components/MapView';
import { SectionHeader, Note } from '@/components/ui';

export default function DuAnPage() {
  const [list, setList] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.projects(q.trim() || undefined)
        .then((r) => setList((r.data || []) as Project[]))
        .catch(() => setList([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // dự án có toạ độ mới vẽ được lên bản đồ
  const mapped = list.filter((p) =>
    (p as any).lat != null && (p as any).lng != null);

  const points = mapped.map((p: any) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    approximate: p.lat_approximate,
    href: `/tim-kiem/?project=${p.id}`,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <SectionHeader
        title="Dự án bất động sản TP.HCM"
        sub="Chung cư, căn hộ cao cấp và khu đô thị đang có tin bán & cho thuê"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm dự án theo tên… (Vinhomes, The Prive, Masteri…)"
            aria-label="Tìm dự án"
            className="field flex-1 min-w-0 h-12 rounded-r-none"
          />
          <button type="button" aria-label="Tìm"
                  className="shrink-0 h-12 px-6 rounded-r-xl bg-grad-flame text-white
                             font-bold shadow-glow hover:brightness-110
                             transition-all duration-300 inline-flex items-center">
            <iconify-icon icon="lucide:search" />
          </button>
        </div>

        <button
          onClick={() => setShowMap(!showMap)}
          className={showMap ? 'btn-outline shrink-0' : 'btn-primary shrink-0'}
        >
          <iconify-icon icon={showMap ? 'lucide:map-pin-off' : 'lucide:map'} />
          {showMap ? 'Ẩn bản đồ' : 'Xem bản đồ'}
        </button>
      </div>

      {showMap && points.length > 0 && (
        <div className="mb-8">
          <MapView points={points} height="h-[420px]" />
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <Note tone="info" title={q ? 'Không tìm thấy dự án phù hợp' : 'Chưa có dữ liệu dự án'}>
          {q
            ? 'Thử từ khoá khác, ví dụ chỉ nhập “Vinhomes” thay vì cả tên dài.'
            : 'Chạy script nạp danh sách dự án chung cư để mục này có dữ liệu.'}
        </Note>
      ) : (
        <>
          <p className="text-[13px] text-coal-400 mb-4">
            {list.length} dự án
            {mapped.length < list.length && (
              <> · {list.length - mapped.length} dự án chưa có toạ độ để hiện trên bản đồ</>
            )}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((p) => <ProjectCard key={p.id} p={p} />)}
          </div>
        </>
      )}
    </div>
  );
}