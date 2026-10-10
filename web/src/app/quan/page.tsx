'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type AdminUnit, type AdminWard } from '@/lib/api';
import { DISTRICTS, REGION_LABEL, type DistrictSeed } from '@/data/districts';

export default function QuanPage() {
  // đếm số phường thực tế từ API (fallsback 0 nếu API chưa sẵn sàng)
  const [wardsByDistrict, setWardsByDistrict] = useState<Record<number, number>>({});

  useEffect(() => {
    api.adminUnits()
      .then((r: { districts: AdminUnit[]; wards: AdminWard[] }) => {
        const m: Record<number, number> = {};
        for (const w of r.wards) m[w.district_id] = (m[w.district_id] || 0) + 1;
        setWardsByDistrict(m);
      })
      .catch(() => {});
  }, []);

  // tra cứu ID thật từ API để link bộ lọc hoạt động chính xác
  const [idBySlug, setIdBySlug] = useState<Record<string, number>>({});
  useEffect(() => {
    api.adminUnits()
      .then((r) => setIdBySlug(Object.fromEntries(r.districts.map((d) => [d.slug, d.id]))))
      .catch(() => {});
  }, []);

  const groups = (
    ['noi-thanh', 'moi', 'ngoai-thanh'] as const
  ).map((r) => [r, DISTRICTS.filter((d) => d.region === r)] as const);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <h1 className="h1 mb-2">Bất động sản theo khu vực TP.HCM</h1>
      <p className="text-coal-500 text-sm mb-10 max-w-2xl">
        Tra cứu nhanh tin mua bán và cho thuê theo {DISTRICTS.length} đơn vị hành chính
        cấp huyện. Tìm được bằng cả tên mới lẫn tên cũ trước khi sáp nhập.
      </p>

      {groups.map(([region, list]) => (
        <section key={region} className="mb-12">
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="h2">{REGION_LABEL[region]}</h2>
            <span className="text-[13px] text-coal-400">
              {list.length} đơn vị{region === 'moi' && ' — tạo mới từ đợt sáp nhập 2025'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d) => {
              const did = idBySlug[d.slug];
              const q = encodeURIComponent(d.name_new);
              return (
                <div key={d.slug} className="card p-5">
                  <Link href={`/quan/${d.slug}`}
                        className="flex items-center gap-2 text-[16px] font-bold
                                   hover:text-flame-600 transition-colors duration-200">
                    <iconify-icon icon="lucide:map-pin" className="text-flame-600 shrink-0" />
                    {d.name_new}
                    <iconify-icon icon="lucide:arrow-right" className="text-cream-300 ml-auto" />
                  </Link>

                  {d.name_old && (
                    <p className="text-[12px] text-coal-400 mt-2 ml-6">
                      Trước đây: {d.name_old}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-cream-100 text-[12.5px]">
                    {wardsByDistrict[did] != null && (
                      <span className="text-coal-400">
                        {wardsByDistrict[did]} phường/xã
                      </span>
                    )}
                    <div className="ml-auto flex gap-3">
                      <Link href={did ? `/tim-kiem/?district=${did}` : `/tim-kiem/?q=${q}`}
                            className="font-bold text-flame-600 hover:text-amber-500
                                       transition-colors">
                        Mua bán
                      </Link>
                      <Link href={did ? `/tim-kiem/?type=rent&district=${did}` : `/tim-kiem/?type=rent&q=${q}`}
                            className="font-bold text-flame-600 hover:text-amber-500
                                       transition-colors">
                        Cho thuê
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}