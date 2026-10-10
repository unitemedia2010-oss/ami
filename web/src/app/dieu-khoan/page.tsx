import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản và điều kiện sử dụng website bất động sản TP.HCM.',
};

export default function DieuKhoanPage() {
  const articles = [
    {
      t: 'Điều 1. Phạm vi và đối tượng áp dụng',
      b: 'Điều khoản này áp dụng cho mọi người dùng truy cập và sử dụng website. Khi đăng ký tài khoản hoặc đăng tin, bạn đồng ý với toàn bộ nội dung dưới đây.',
    },
    {
      t: 'Điều 2. Vai trò của người đăng tin',
      b: 'Người đăng chịu trách nhiệm về tính chính xác, hợp pháp của thông tin đăng, bao gồm giá, diện tích, vị trí, hình ảnh và thông tin liên hệ. Người đăng phải có quyền đối với bất động sản đăng hoặc được bên sở hữu ủy quyền.',
    },
    {
      t: 'Điều 3. Quyền xem và sử dụng dữ liệu',
      b: 'Mọi thông tin hiển thị trên website chỉ nhằm mục đích tham khảo. Chúng tôi không bảo đảm tính chính xác tuyệt đối của thông tin do người dùng cung cấp.',
    },
    {
      t: 'Điều 4. Xem số điện thoại liên hệ',
      b: 'Số điện thoại liên hệ chỉ hiển thị cho người dùng đã đăng nhập. Mỗi lượt xem được ghi nhận nhằm mục đích bảo vệ dữ liệu của người đăng và ngăn chặn thu thập tự động.',
    },
    {
      t: 'Điều 5. Nghiêm cấm thu thập dữ liệu tự động',
      b: 'Nghiêm cấm sử dụng phần mềm tự động, spider, crawler, script hoặc bất kỳ công cụ kỹ thuật nào để thu thập, sao chép hay khai thác dữ liệu trên website mà không có sự đồng ý bằng văn bản. Vi phạm dẫn đến khoá truy cập và các biện pháp pháp lý phù hợp.',
    },
    {
      t: 'Điều 6. Quyền của chúng tôi',
      b: 'Chúng tôi bảo lưu quyền gỡ tin không phù hợp, từ chối tin trùng lặp, tạm khoá hoặc khoá tài khoản vi phạm điều khoản, và áp dụng các biện pháp kỹ thuật cần thiết để bảo vệ hệ thống.',
    },
    {
      t: 'Điều 7. Miễn trừ trách nhiệm',
      b: 'Chúng tôi không chịu trách nhiệm đối với thiệt hại phát sinh từ giao dịch giữa người mua và người đăng, hoặc từ thông tin công bố không chính xác do người đăng cung cấp.',
    },
    {
      t: 'Điều 8. Điều khoản bất khả kháng',
      b: 'Các bên không chịu trách nhiệm đối với việc không thực hiện nghĩa vụ do nguyên nhân bất khả kháng như thiên tai, mất điện, tấn công mạng, quyết định của cơ quan nhà nước.',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="h1 mb-1">Điều khoản sử dụng</h1>
      <p className="text-[13.5px] text-coal-500 mb-8">
        Bản khung — cần bổ sung thông tin doanh nghiệp trước khi website chính thức hoạt động.
      </p>

      <div className="space-y-4">
        {articles.map((a) => (
          <section key={a.t} className="field-box">
            <h2 className="text-[14px] font-semibold text-coal-800 mb-1.5">{a.t}</h2>
            <p className="text-[13px] text-coal-600 leading-relaxed">{a.b}</p>
          </section>
        ))}
      </div>

      <div className="flex gap-4 mt-8">
        <Link href="/quyen-rieng-tu" className="text-[13px] text-brand-600 hover:underline">
          Chính sách quyền riêng tư
        </Link>
        <Link href="/lien-he" className="text-[13px] text-brand-600 hover:underline">
          Liên hệ
        </Link>
      </div>
    </div>
  );
}