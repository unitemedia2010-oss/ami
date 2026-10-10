import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-[64px] font-black text-brand-100 leading-none mb-2">404</p>
      <h1 className="h1 mb-2">Không tìm thấy trang</h1>
      <p className="text-[13.5px] text-coal-500 mb-8">
        Đường dẫn không tồn tại hoặc đã bị chuyển. Bạn có thể thử tìm kiếm lại.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 justify-center mb-10">
        <Link href="/" className="btn-primary h-11 px-6">Về trang chủ</Link>
        <Link href="/tim-kiem" className="btn-outline h-11 px-6">Tìm kiếm tin</Link>
      </div>

      <div className="field-box text-left">
        <h2 className="text-[13px] font-semibold text-coal-700 mb-2.5">Tra cứu theo khu vực</h2>
        <div className="flex flex-wrap gap-1.5">
          {['Quận 1', 'Quận 7', 'Thủ Đức', 'Bình Thạnh', 'Gò Vấp', 'Tân Phú',
            'Bình Chánh', 'Củ Chi', 'Hóc Môn', 'Nhơn Trạch'].map((n) => (
            <Link key={n} href={`/tim-kiem/?q=${encodeURIComponent(n)}`} className="chip hover:chip-accent">
              {n}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}