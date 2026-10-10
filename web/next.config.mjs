/** @type {import('next').NextConfig} */

// ⚠ Đường dẫn gốc khi mở trang.
//
//   Trang đang nằm ở https://unitemedia2010-oss.github.io/ami/ — đây là
//   "project site" của GitHub, nên mọi thứ nằm trong thư mục con /ami, KHÔNG
//   nằm ở gốc tên miền. Nếu thiếu basePath, HTML mở được nhưng mọi file
//   _next/*.js và ảnh đều trả 404 → trang trắng.
//
//   Đặt qua biến môi trường vì hai chế độ khác nhau:
//     • Build lên github.io/ami      → NEXT_PUBLIC_BASE_PATH=/ami
//     • Build khi đã gắn tên miền riêng → để TRỐNG, vì lúc đó trang phục vụ
//       ở gốc tên miền (https://sgrealty.vn/), thêm /ami sẽ thành đường dẫn hỏng.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Xuất file tĩnh để deploy lên GitHub Pages
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },   // GitHub Pages không có image optimizer

  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,

  // ⚠ KHÔNG khai báo khối `env` ở đây.
  //   `env` trong next.config GHI ĐÈ biến NEXT_PUBLIC_* lấy từ môi trường và
  //   từ .env.local. Trước đây có đặt NEXT_PUBLIC_API_URL ở đây nên dù build
  //   với biến khác, bundle vẫn nhúng URL cũ — mọi lệnh gọi API hỏng mà
  //   không có lỗi build nào báo.
  //   Next.js tự đưa NEXT_PUBLIC_* từ môi trường vào bundle, không cần `env`.

  // ⚠ Không khai báo redirects/rewrites ở đây: chúng không hoạt động với
  //   output: 'export'. Muốn chuyển hướng thì dùng file .htaccess trên
  //   Cloudflare Pages hoặc meta refresh.

  // Giới hạn số tiến trình song song khi build.
  // GitHub Actions có 2 vCPU / 7GB RAM — mặc định Next.js spawn nhiều worker
  // và có thể chạm trần RAM. Số nhỏ = build chậm hơn nhưng không bị OOM.
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;