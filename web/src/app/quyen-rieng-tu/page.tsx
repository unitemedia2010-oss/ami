import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Quyền riêng tư',
  description: 'Chính sách bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.',
};

export default function QuyenRiengTuPage() {
  const sections = [
    {
      t: 'Dữ liệu chúng tôi thu thập',
      items: [
        'Khi bạn đăng ký tài khoản: email, mật khẩu được mã hoá, tên hiển thị, số điện thoại (nếu bạn cung cấp).',
        'Khi bạn xem một tin: mã tin, thời điểm, và một giá trị băm (hash) của địa chỉ IP kết hợp thiết bị — không phải IP gốc.',
        'Khi bạn gửi biểu mẫu liên hệ: họ tên, số điện thoại, nội dung nhắn tin.',
      ],
    },
    {
      t: 'Dữ liệu chúng tôi KHÔNG thu thập',
      items: [
        'Không thu thập hình ảnh, tin nhắn hay nội dung riêng tư trên thiết bị của bạn.',
        'Không bán, trao đổi hoặc chia sẻ dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích thương mại.',
        'Không dùng dữ liệu để gửi quảng cáo không có sự đồng ý của bạn.',
      ],
    },
    {
      t: 'Mục đích sử dụng',
      items: [
        'Cung cấp chức năng đăng nhập và xem số điện thoại liên hệ của tin đăng.',
        'Ngăn chặn lạm dụng, gian lận và việc thu thập dữ liệu hàng loạt tự động.',
        'Thống kê lượt xem phục vụ người đăng tin.',
      ],
    },
    {
      t: 'Bảo mật dữ liệu liên hệ của chủ đầu tư',
      items: [
        'Số điện thoại và địa chỉ chi tiết của tin đăng được lưu riêng, tách biệt khỏi dữ liệu công khai.',
        'Số điện thoại chỉ hiển thị cho người đã đăng nhập. Mỗi lượt xem đều được ghi nhận.',
        'Dữ liệu cá nhân được lưu trên hạ tầng tại Việt Nam theo quy định pháp luật.',
      ],
    },
    {
      t: 'Quyền của bạn',
      items: [
        'Yêu cầu xem, chỉnh sửa hoặc xoá thông tin cá nhân của bạn bất kỳ lúc nào.',
        'Rút lại sự đồng ý bằng cách xoá tài khoản.',
        'Khiếu nại về việc xử lý dữ liệu — chúng tôi phản hồi trong 72 giờ.',
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="h1 mb-1">Chính sách quyền riêng tư</h1>
      <p className="text-[13.5px] text-coal-500 mb-8">
        Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và Luật An toàn thông tin mạng.
      </p>

      {sections.map((s) => (
        <section key={s.t} className="field-box mb-4">
          <h2 className="h2 mb-3">{s.t}</h2>
          <ul className="space-y-2">
            {s.items.map((i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] text-coal-600">
                <span className="shrink-0 text-cream-300 mt-0.5">•</span>
                <span className="leading-relaxed">{i}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="field-box mt-6 mb-8 bg-cream-100 border-cream-200">
        <p className="text-[13px] text-coal-600 leading-relaxed">
          <b>Lưu ý:</b> trang này là bản mẫu khung. Trước khi website chính thức hoạt động,
          bạn cần rà soát lại với tư vấn pháp lý và bổ sung đầy đủ thông tin doanh nghiệp
          (tên pháp lý, mã số thuế, địa chỉ, cơ chế tiếp nhận khiếu nại theo Điều 13
          Nghị định 13).
        </p>
      </div>

      <Link href="/" className="text-[13px] text-brand-600 hover:underline">← Về trang chủ</Link>
    </div>
  );
}