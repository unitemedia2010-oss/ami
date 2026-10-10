import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Đăng tin miễn phí',
  description:
    'Đăng tin bất động sản miễn phí tại SGREALTY. Xem số điện thoại người mua không giới hạn, không tính phí.',
};

const STEPS = [
  { icon: 'lucide:user-plus', title: 'Đăng ký tài khoản', body: 'Miễn phí, mất khoảng 30 giây bằng email.' },
  { icon: 'lucide:clipboard-pen', title: 'Nhập thông tin', body: 'Chọn dự án, diện tích, phòng ngủ, giá và hình ảnh.' },
  { icon: 'lucide:search-check', title: 'Chờ duyệt', body: 'Bộ phận kiểm duyệt xử lý trong 2 giờ làm việc.' },
  { icon: 'lucide:rocket', title: 'Tin lên website', body: 'Hiện ngay trên trang và trong kết quả tìm kiếm.' },
];

const BENEFITS = [
  ['lucide:phone-call', 'Xem SĐT không giới hạn',
   'Xem số điện thoại người mua không giới hạn số lượt, không tính phí.'],
  ['lucide:flame', 'Tin nổi bật',
   'Gói nổi bật đưa tin lên vị trí đầu tiên của khu vực bạn chọn.'],
  ['lucide:bar-chart-3', 'Thống kê lượt xem',
   'Biết tin của bạn được xem bao nhiêu lần, ai xem, ở khu vực nào.'],
  ['lucide:layers', 'Quản lý nhiều tin',
   'Đăng 10 tin trở lên bằng một tài khoản, quản lý tập trung.'],
];

export default function DangTinPage() {
  return (
    <>
      {/* ==================================================================== HERO */}
      <section className="bg-flame-600 text-white px-4 md:px-8">
        <div className="max-w-7xl mx-auto py-16 md:py-24 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                           bg-white/10 text-[13px] font-semibold mb-6">
            <iconify-icon icon="lucide:badge-plus" className="text-orange-400" />
            Miễn phí vĩnh viễn
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5">
            Đăng tin bất động sản<br className="hidden sm:block" />
            miễn phí
          </h1>
          <p className="text-blue-100 text-lg max-w-xl mx-auto">
            Đăng tin trong 2 phút. Xem số điện thoại người mua không giới hạn,
            không tính phí, không cần nạp tiền.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
        {/* ------------------------------------------------------------ các bước */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {STEPS.map((s, i) => (
            <div key={s.title} className="section-card relative">
              <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-500
                               text-white grid place-items-center font-bold text-sm
                               shadow-card">{i + 1}</span>
              <div className="w-12 h-12 rounded-xl bg-flame-50 text-flame-600
                              grid place-items-center mb-4">
                <iconify-icon icon={s.icon} className="text-2xl" />
              </div>
              <h3 className="text-[15px] font-bold mb-1">{s.title}</h3>
              <p className="text-[13px] text-coal-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </section>

        {/* -------------------------------------------------------------- lợi ích */}
        <section className="grid sm:grid-cols-2 gap-5 mb-16">
          {BENEFITS.map(([ic, t, d]) => (
            <div key={t} className="section-card flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500
                              grid place-items-center shrink-0">
                <iconify-icon icon={ic} className="text-2xl" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold mb-1">{t}</h3>
                <p className="text-[13px] text-coal-500 leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ---------------------------------------------------------------- so sánh */}
        <section className="section-card mb-16 overflow-hidden !p-0">
          <div className="grid md:grid-cols-2">
            {[
              {
                title: 'Tại SGREALTY',
                items: [
                  'Đăng tin miễn phí, không giới hạn số tin',
                  'Xem số điện thoại người mua không giới hạn',
                  'Xem được địa chỉ đầy đủ của căn hộ',
                  'Tin nổi bật theo khu vực',
                  'Thống kê lượt xem chi tiết',
                ],
                on: true,
              },
              {
                title: 'Nơi khác',
                items: [
                  'Tính phí mỗi lần xem số điện thoại',
                  'Giới hạn số lượt xem mỗi ngày',
                  'Phải chờ đối tác gọi lại',
                  'Ít hiển thị trên kết quả tìm kiếm',
                  'Thống kê sơ sài hoặc không có',
                ],
                on: false,
              },
            ].map((col) => (
              <div key={col.title} className={`p-8 ${col.on ? '' : 'bg-cream-100 md:border-l border-cream-200'}`}>
                <h3 className={`text-lg font-bold mb-5 ${col.on ? 'text-flame-600' : 'text-coal-500'}`}>
                  {col.title}
                </h3>
                <ul className="space-y-3">
                  {col.items.map((it) => (
                    <li key={it} className="flex items-start gap-3 text-[13.5px]">
                      <iconify-icon
                        icon={col.on ? 'lucide:check-circle-2' : 'lucide:x-circle'}
                        className={`shrink-0 mt-0.5 ${
                          col.on ? 'text-green-600' : 'text-cream-300'
                        }`}
                      />
                      <span className={col.on ? 'text-coal-700' : 'text-coal-400'}>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- CTA */}
        <section className="bg-amber-500 rounded-2xl px-6 md:px-12 py-14 text-center
                            text-white shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Sẵn sàng đăng tin?</h2>
          <p className="text-white/90 text-[15px] mb-8">
            Tạo tài khoản miễn phí trong 30 giây
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dang-nhap" className="btn-lg bg-white text-amber-500 hover:scale-105
                                              transition-transform duration-200
                                              inline-flex items-center gap-3">
              Đăng ký & Đăng tin
              <iconify-icon icon="lucide:arrow-right-circle" />
            </Link>
            <Link href="/huong-dan" className="btn-lg btn-outline text-white border-white/50
                                             hover:bg-white/10">
              Hướng dẫn chi tiết
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}