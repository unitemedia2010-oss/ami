import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hướng dẫn đăng tin',
  description: 'Hướng dẫn chi tiết cách đăng tin bất động sản miễn phí và các quy tắc cần tuân thủ.',
};

const rules = [
  ['Tin đúng thực tế', 'Không đăng giá ảo, không mô tả sai diện tích hay vị trí. Tin sai lệch sẽ bị gỡ và khoá tài khoản.'],
  ['Ảnh thật', 'Dùng ảnh chụp thực tế căn hộ. Không dùng ảnh mẫu, ảnh dự án khác hoặc ảnh có watermark của website khác.'],
  ['Thông tin liên hệ đúng', 'Số điện thoại phải thuộc về người đăng hoặc người được ủy quyền. Chúng tôi có quyền liên hệ xác minh.'],
  ['Một căn một tin', 'Không đăng trùng lặp cùng một căn hộ nhiều tin. Hệ thống tự phát hiện theo giá, diện tích và tiêu đề tương tự.'],
  ['Tin không đúng hạn', 'Tin bán đã giao hoặc tin thuê hết hạn cần cập nhật hoặc gỡ trong 3 ngày.'],
  ['Không đăng nội dung cấm', 'Không đăng tin vũ khí, dược phẩm bất hợp pháp, viễn thông lừa đảo hoặc nội dung vi phạm pháp luật.'],
];

const faq = [
  ['Đăng tin có mất phí không?', 'Không. Đăng tin và xem số điện thoại người mua đều miễn phí, không giới hạn số lượt.'],
  ['Tin của tôi duyệt mất bao lâu?', 'Thông thường dưới 2 giờ trong giờ làm việc. Tin nổi bật cần thêm thời gian xác minh nội dung.'],
  ['Tôi có được ưu tiên hiển thị không?', 'Có. Gói nổi bật đưa tin lên đầu danh sách của khu vực và loại tin bạn chọn.'],
  ['Bao lâu thì hết hạn tin?', 'Tin bán mặc định 90 ngày, tin cho thuê 30 ngày, có thể gia hạn miễn phí.'],
  ['Làm sao biết tin của tôi được xem bao nhiêu?', 'Trang quản lý tin hiển thị lượt xem theo ngày, khu vực và số lượt xem số điện thoại.'],
  ['Tôi có thể xoá tin bất kỳ lúc nào?', 'Có, bạn tự xoá tin của mình trong trang quản lý, không cần liên hệ hỗ trợ.'],
];

export default function HuongDanPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="h1 mb-1">Hướng dẫn đăng tin bất động sản</h1>
      <p className="text-[13.5px] text-coal-500 mb-8">
        Toàn bộ quy trình và quy tắc áp dụng cho mọi tin đăng trên website.
      </p>

      {/* -------------------------------------------------------- quy trình */}
      <section className="field-box mb-6">
        <h2 className="h2 mb-3">Quy trình đăng tin</h2>
        <ol className="space-y-3">
          {[
            'Tạo tài khoản tại trang Đăng nhập (chọn “Chưa có tài khoản? Đăng ký”).',
            'Chọn loại tin: Mua bán hoặc Cho thuê.',
            'Chọn dự án và toà nhà nếu có; nếu không, chọn phường/xã và đường.',
            'Nhập diện tích, số phòng ngủ, tầng, hướng, nội thất và mức giá.',
            'Tải lên tối thiểu 3 ảnh thực tế, ảnh đầu tiên sẽ là ảnh bìa.',
            'Nhập số điện thoại liên hệ. Số này chỉ hiển thị sau khi người mua đăng nhập.',
            'Gửi tin và chờ duyệt. Bộ phận kiểm duyệt phản hồi trong 2 giờ làm việc.',
          ].map((s, i) => (
            <li key={i} className="flex gap-3 text-[13.5px] text-coal-700">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700
                               grid place-items-center text-[11px] font-bold mt-0.5">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------- quy tắc */}
      <section className="field-box mb-6">
        <h2 className="h2 mb-3">Quy tắc bắt buộc</h2>
        <div className="space-y-3">
          {rules.map(([t, d]) => (
            <div key={t} className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700
                               grid place-items-center text-[11px] font-bold mt-0.5">
                !
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-coal-800">{t}</p>
                <p className="text-[13px] text-coal-500 mt-0.5 leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-coal-400 mt-4 pt-4 border-t border-cream-200">
          Vi phạm quy tắc có thể dẫn đến gỡ tin, tạm khoá hoặc khoá vĩnh viễn tài khoản.
        </p>
      </section>

      {/* -------------------------------------------------------------- FAQ */}
      <section className="field-box mb-8">
        <h2 className="h2 mb-4">Câu hỏi thường gặp</h2>
        <dl className="space-y-4">
          {faq.map(([q, a]) => (
            <div key={q}>
              <dt className="text-[13.5px] font-semibold text-coal-800 mb-1">{q}</dt>
              <dd className="text-[13px] text-coal-500 leading-relaxed">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-col sm:flex-row gap-2">
        <Link href="/dang-nhap" className="btn-primary h-11">Đăng ký & Đăng tin</Link>
        <Link href="/lien-he" className="btn-outline h-11">Liên hệ hỗ trợ</Link>
      </div>
    </div>
  );
}