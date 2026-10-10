import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DISTRICTS, DISTRICT_BLURB, REGION_LABEL, findBySlug } from '@/data/districts';
import { u } from '@/lib/basePath';

/* ------------------------------------------------------------------
 *  Static export: khai báo trước mọi slug cần build.
 *  Thiếu một slug → trang đó 404 vĩnh viễn trên GitHub Pages.
 * ---------------------------------------------------------------- */
export function generateStaticParams() {
  return DISTRICTS.map((d) => ({ slug: d.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = findBySlug(slug);
  if (!d) return { title: 'Không tìm thấy khu vực' };

  const tenCu = d.name_old && d.name_old !== d.name_new ? ` (${d.name_old})` : '';

  return {
    title: `Bất động sản ${d.name_new}${tenCu} — Mua bán & Cho thuê`,
    description:
      `Tin mua bán và cho thuê căn hộ, chung cư, nhà đất tại ${d.name_new}${tenCu} TP.HCM. ` +
      `Cập nhật liên tục, xem số điện thoại liên hệ miễn phí sau khi đăng nhập.`,
    alternates: { canonical: `/quan/${d.slug}` },
    openGraph: {
      title: `Bất động sản ${d.name_new}${tenCu}`,
      description: `Mua bán & cho thuê tại ${d.name_new}${tenCu} — cập nhật liên tục.`,
      url: `/quan/${d.slug}`,
    },
  };
}

export default async function DistrictPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = findBySlug(slug);
  if (!d) notFound();

  const blurb = DISTRICT_BLURB[d.slug];
  const tenCu = d.name_old && d.name_old !== d.name_new ? d.name_old : null;
  const q = encodeURIComponent(d.name_new);
  const related = DISTRICTS.filter((x) => x.slug !== d.slug && x.region === d.region).slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
      {/* ---------------------------------------------------------- breadcrumb */}
      <nav aria-label="Đường dẫn" className="text-[12.5px] text-coal-400 mb-6 flex items-center gap-1.5">
        <a href={u('/')} className="hover:text-flame-600">Trang chủ</a>
        <span>/</span>
        <a href={u('/quan')} className="hover:text-flame-600">Khu vực</a>
        <span>/</span>
        <span className="text-coal-600">{d.name_new}</span>
      </nav>

      {/* ------------------------------------------------------------- tiêu đề */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="chip">{REGION_LABEL[d.region]}</span>
        </div>
        <h1 className="h1 mb-2">{d.name_new}</h1>
        {tenCu && (
          <p className="text-coal-500 text-sm">
            Tên trước đây: <b className="text-coal-700">{tenCu}</b>
          </p>
        )}
      </header>

      {/* ------------------------------------------------------------- CTA */}
      <div className="grid sm:grid-cols-2 gap-3 mb-10">
        <a href={`/tim-kiem/?q=${q}`} className="btn-primary h-14 text-[15px]">
          <iconify-icon icon="lucide:shopping-bag" /> Tin mua bán tại {d.name_new}
        </a>
        <a href={`/tim-kiem/?type=rent&q=${q}`} className="btn-outline h-14 text-[15px]">
          <iconify-icon icon="lucide:key-round" /> Tin cho thuê tại {d.name_new}
        </a>
      </div>

      {/* -------------------------------------------------------------- mô tả */}
      <section className="section-card mb-8">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <iconify-icon icon="lucide:building-2" className="text-flame-600 text-xl" />
          Bất động sản {d.name_new} — Mua bán & Cho thuê
        </h2>
        <p className="text-[13.5px] leading-relaxed text-coal-600">
          {blurb ??
            `Trang tổng hợp tin mua bán và cho thuê bất động sản tại ${d.name_new} TP. Hồ Chí Minh, ` +
            `bao gồm căn hộ chung cư, nhà phố và đất nền, cập nhật liên tục hằng ngày.`}
          {tenCu && (
            <>
              {' '}Khu vực này trước đây gọi là <b>{tenCu}</b>; sau đợt sắp xếp hành chính năm
              2025, tên đơn vị đã được thay đổi. Hệ thống tìm kiếm hỗ trợ tra cứu bằng
              <b> cả tên cũ lẫn tên mới</b>, nên bạn gõ tên quận trước đây vẫn ra đúng kết quả.
            </>
          )}
        </p>

        <h3 className="text-[14px] font-bold mt-6 mb-3">Tìm nhanh tại {d.name_new}</h3>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {[
            ['Căn hộ 1 phòng', ''],
            ['Căn hộ 2 phòng', '?bedrooms=2'],
            ['Căn hộ 3 phòng trở lên', '?bedrooms=3'],
            ['Chung cư mini', `?q=${encodeURIComponent(d.name_new + ' mini')}`],
            ['Dưới 2 tỷ', '?max=2000'],
            ['Từ 5 tỷ trở lên', '?min=5000'],
          ].map(([label, qs]) => (
            <a key={label} href={`/tim-kiem/${qs}`}
               className="px-4 py-3 rounded-xl border border-cream-200 text-[13.5px] font-medium
                          text-coal-700 hover:border-flame-400 hover:text-flame-600
                          transition-colors duration-200 flex items-center gap-2">
              <iconify-icon icon="lucide:chevron-right" className="text-cream-300" />
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- liên quan */}
      {related.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">Khu vực lân cận</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <a key={r.slug} href={`/quan/${r.slug}`} className="chip">{r.name_new}</a>
            ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------- đơn vị cấp xã (ghi chú) */}
      <section className="section-card">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
          <iconify-icon icon="lucide:map-pin" className="text-flame-600 text-xl" />
          Phường / xã thuộc {d.name_new}
        </h2>
        <p className="text-[13px] text-coal-500">
          Danh sách 168 phường, xã của TP.HCM sẽ được cập nhật sau khi đối chiếu với
          Nghị quyết 1685/NQ-UBTVQH15. Hiện bạn có thể tìm theo tên trong ô tìm kiếm.
        </p>
        <a href={`/tim-kiem/?q=${q}`} className="btn-primary btn-sm mt-4 inline-flex">
          <iconify-icon icon="lucide:search" /> Xem tất cả tin tại {d.name_new}
        </a>
      </section>

      {/*
        Ghi chú cho người duy trì:
        Khi import xong 168 phường, cần tạo trang /quan/[districtSlug]/[wardSlug]
        với generateStaticParams đọc từ data/wards.json (export riêng từ database).
        Cột ward_slug đã có sẵn trong view listing_cards.
      */}
    </div>
  );
}