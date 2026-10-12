import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeader, StatCard } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Về Chúng Tôi',
  description:
    'SGREALTY — hệ thống phân phối bất động sản tại TP.HCM. Câu chuyện, sứ mệnh và cách chúng tôi bảo vệ dữ liệu liên hệ của người dùng.',
};

const VALUES = [
  {
    icon: 'lucide:shield-check',
    title: 'Bảo vệ dữ liệu liên hệ',
    body: 'Số điện thoại và địa chỉ chi tiết được tách khỏi dữ liệu công khai, chỉ hiển thị sau khi đăng nhập và xác minh. Mỗi lượt xem đều được ghi nhận.',
  },
  {
    icon: 'lucide:search-check',
    title: 'Tìm kiếm hiểu biết',
    body: 'Hệ thống nhận diện cả tên quận cũ và tên đơn vị hành chính mới sau sáp nhập năm 2025, giúp tìm đúng khu vực dù cách gọi đã thay đổi.',
  },
  {
    icon: 'lucide:badge-check',
    title: 'Thông tin đúng thực tế',
    body: 'Mọi tin đều qua bước kiểm duyệt. Chúng tôi chủ động gỡ tin sai thông tin và hỗ trợ người dùng tố cáo tin đăng gian lận.',
  },
  {
    icon: 'lucide:wallet',
    title: 'Miễn phí, không giới hạn',
    body: 'Xem số điện thoại liên hệ không tính phí và không giới hạn số lượt, giúp giao dịch diễn ra nhanh và minh bạch.',
  },
];

const TIMELINE = [
  { year: '2024', title: 'Khởi đầu', body: 'Nhóm cập nhật tin bất động sản thủ công tại khu vực Thủ Thiêm và Đông TP.HCM.' },
  { year: 'Đầu 2025', title: 'Mở rộng khu vực', body: 'Phủ sóng 23 đơn vị hành chính cấp huyện và 168 phường, xã.' },
  { year: '07/2025', title: 'Sáp nhập hành chính', body: 'Ra mắt tính năng tra cứu theo tên quận cũ sau khi hệ thống hành chính thay đổi.' },
  { year: '2026', title: 'Nền tảng SGREALTY', body: 'Tách PII khỏi dữ liệu công khai, triển khai lớp phòng chống thu thập dữ liệu tự động.' },
];

export default function AboutPage() {
  return (
    <>
      {/* ==================================================================== HERO */}
      <section className="bg-flame-600 text-white px-4 md:px-8">
        <div className="max-w-7xl mx-auto py-16 md:py-24 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                           bg-white/10 text-[13px] font-semibold mb-6">
            <iconify-icon icon="lucide:building-2" className="text-orange-400" />
            Về SGREALTY
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5 max-w-3xl mx-auto">
            Hệ thống phân phối bất động sản hàng đầu tại Sài Gòn
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Chúng tôi kết nối người bán và người mua bằng thông tin chính xác,
            tra cứu dễ dàng và bảo vệ quyền lợi của cả hai bên.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
        {/* ------------------------------------------------------------- số liệu */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-20 -mt-6">
          <StatCard icon="lucide:building" label="Tin đăng" value="27.000+" delta="cập nhật liên tục" />
          <StatCard icon="lucide:building-2" label="Dự án" value="150+" />
          <StatCard icon="lucide:map" label="Khu vực" value="21 quận/huyện" />
          <StatCard icon="lucide:users" label="Người dùng" value="Miễn phí vĩnh viễn" />
        </section>

        {/* -------------------------------------------------------------- sứ mệnh */}
        <section className="grid lg:grid-cols-2 gap-10 mb-20 items-center">
          <div>
            <SectionHeader title="Sứ mệnh của chúng tôi" />
            <p className="text-coal-600 text-[15px] leading-relaxed mb-4">
              Thị trường bất động sản TP.HCM có nhiều tin đăng, nhưng thông tin thường
              khó tra cứu: tên quận thay đổi sau sáp nhập, tin cũ vẫn nằm trên trang,
              số điện thoại thì công khai quá sớm hoặc bị giấu bằng nhiều lớp quảng cáo.
            </p>
            <p className="text-coal-600 text-[15px] leading-relaxed">
              SGREALTY tập trung vào ba điều: <b className="text-coal-900">thông tin đúng</b>,
              <b className="text-coal-900"> tra cứu nhanh</b> và
              <b className="text-coal-900"> tôn trọng cả hai bên giao dịch</b>.
              Chúng tôi không tính phí xem số điện thoại và không giới hạn số lượt —
              người dùng và chủ nhà cùng có được thông tin cần thiết.
            </p>
          </div>

          <div className="bg-gradient-to-br from-flame-600 to-flame-800
                          rounded-2xl p-8 text-white shadow-card">
            <iconify-icon icon="lucide:quote" className="text-5xl text-white/20 mb-4" />
            <p className="text-lg font-medium leading-relaxed mb-6">
              “Giao dịch bất động sản nên minh bạch. Người mua xem được số điện thoại
              thật, người bán không bị lộ địa chỉ căn hộ công khai cho cả thị trường.
              Đó là ranh giới chúng tôi giữ.”
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 grid place-items-center
                              font-bold text-white">SR</div>
              <div>
                <p className="font-bold text-sm">Đội ngũ SGREALTY</p>
                <p className="text-blue-200 text-xs">TP. Hồ Chí Minh</p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- giá trị */}
        <section className="mb-20">
          <SectionHeader title="Cam kết của chúng tôi" sub="Bốn nguyên tắc áp dụng hằng ngày" />
          <div className="grid gap-5 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="section-card">
                <div className="w-12 h-12 rounded-xl bg-flame-50 text-flame-600
                                grid place-items-center mb-4">
                  <iconify-icon icon={v.icon} className="text-2xl" />
                </div>
                <h3 className="text-lg font-bold mb-2">{v.title}</h3>
                <p className="text-[13.5px] text-coal-600 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------------- chặng đường */}
        <section className="mb-20">
          <SectionHeader title="Chặng đường phát triển" />
          <div className="relative pl-8 border-l-2 border-flame-100">
            {TIMELINE.map((t) => (
              <div key={t.year} className="relative pb-8 last:pb-0">
                <span className="absolute -left-[41px] top-1 w-4 h-4 rounded-full
                                 bg-amber-500 border-4 border-white shadow" />
                <p className="text-sm font-bold text-flame-600">{t.year}</p>
                <h3 className="text-base font-bold mb-1">{t.title}</h3>
                <p className="text-[13.5px] text-coal-600 leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- CTA */}
        <section className="bg-amber-500 rounded-2xl px-6 md:px-12 py-12 text-center
                            text-white shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Có tin bất động sản?</h2>
          <p className="text-white/90 text-[15px] mb-8 max-w-lg mx-auto">
            Đăng tin miễn phí, xem số điện thoại người mua không giới hạn số lượt.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dang-tin" className="btn-lg bg-white text-amber-500 hover:scale-105
                                              transition-transform duration-200
                                              inline-flex items-center gap-3">
              Đăng tin ngay
              <iconify-icon icon="lucide:arrow-right-circle" />
            </Link>
            <Link href="/lien-he" className="btn-lg btn-outline text-white border-white/50
                                             hover:bg-white/10">
              Liên hệ hợp tác
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}