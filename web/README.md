# SGREALTY — Website Bất động sản Sài Gòn

Next.js 15 static export, deploy GitHub Pages. Dữ liệu tải động qua Cloudflare Worker.

---

## 1. Design system

Nguồn: tài liệu thiết kế SGREALTY. Toàn bộ token nằm trong `tailwind.config.ts` + `globals.css`.

| Token | Giá trị | Vai trò |
|---|---|---|
| `primary` | `#1E5A96` (bậc 600) | Header, footer, nút phụ, link |
| `accent` | `#FF6B35` (bậc 500) | CTA, nổi bật, giá tiền |
| `ink` | `#F8F9FA` / `#333333` | Nền và chữ |

Font: **Plus Jakarta Sans** nạp qua `next/font/google` — tự tối ưu subset, tự `font-display: swap`,
không gọi ra ngoài. Đổi font chỉ cần sửa `src/app/layout.tsx`.

### ⚠ Vì sao tên màu cam là `accent`, không phải `secondary`

Tên `secondary` đã bị Tailwind chiếm sẵn cho màu nền phần tử form. Ngoài ra Tailwind chỉ
sinh class dạng `bg-<tên>` khi màu khai báo là **chuỗi đơn**; màu dạng object có bậc
(`primary`, `accent`, `ink`) chỉ sinh `bg-<tên>-500`.

Hai lỗi này đều biểu hiện giống nhau — `@apply` báo *“class does not exist”* — nhưng
nguyên nhân khác nhau:

| Lỗi | Dấu hiệu | Cách sửa |
|---|---|---|
| Tên màu bị chiếm | `bg-secondary` không sinh dù đã khai báo | Đổi tên token |
| Thiếu bậc màu | `bg-primary` không sinh vì `primary` là object | Viết `bg-primary-600` |

Khi thêm màu mới, nhớ dùng đủ bậc: `bg-<tên>-600`, **không** viết `bg-<tên>`.

---

## 2. Chạy local

```bash
cd web
npm install
cp .env.example .env.local     # điền giá trị thật
npm run dev
```

## 3. Build

```bash
npm run build        # xuất ra out/
```

> **RAM:** GitHub Actions có 7 GB. `next.config.mjs` đặt `experimental.cpus = 2` để
> tránh Next.js spawn quá nhiều worker và chạm trần RAM. Nếu build local báo
> *“Fatal process out of memory”*, đặt `NODE_OPTIONS=--max-old-space-size=3072`.

Workflow `.github/workflows/deploy.yml` xem ở mục dưới.

---

## 4. Icon

Dùng **Iconify** với bộ Lucide:

```tsx
<iconify-icon icon="lucide:building-2" className="text-3xl" />
```

Script được nạp trong `layout.tsx`. Kiểu JSX khai ở `src/types/iconify.d.ts`.

> ⚠ React 19 đã bỏ namespace `JSX` toàn cục — khai báo phải nằm trong `React.JSX`.
> Khai ở `JSX.IntrinsicElements` sẽ không được nhận diện.

---

## 5. Cấu trúc

```
src/
├── app/
│   ├── layout.tsx              khuôn trang + font + Iconify
│   ├── globals.css             design tokens, .btn .card .chip .field …
│   ├── page.tsx                trang chủ
│   ├── tim-kiem/page.tsx       bộ lọc + gợi ý tên quận cũ
│   ├── chi-tiet/page.tsx       chi tiết + xem SĐT (Turnstile)
│   ├── quan/page.tsx           25 đơn vị hành chính
│   ├── quan/[slug]/page.tsx    ⭐ SSG — URL SEO từng khu vực
│   ├── du-an/page.tsx          dự án
│   ├── so-sanh/page.tsx        ⭐ so sánh tối đa 4 tin
│   ├── yeu-thich/page.tsx      ⭐ watchlist (localStorage)
│   ├── ve-chung-toi/page.tsx   ⭐ giới thiệu
│   ├── lien-he/page.tsx        ⭐ form liên hệ + honeypot
│   ├── dang-nhap|dang-tin|huong-dan|dieu-khoan|quyen-rieng-tu
│   ├── admin/
│   │   ├── page.tsx            tổng quan KPI
│   │   ├── tin-dang/page.tsx   duyệt / ẩn / gỡ tin
│   │   ├── tin-dang/tao/page.tsx
│   │   ├── du-an/page.tsx      dự án
│   │   ├── du-an/tao/page.tsx  kèm xem trước toạ độ
│   │   ├── khach-hang/page.tsx ⭐ phân quyền tài khoản
│   │   ├── lien-he/page.tsx    ⭐ quản lý yêu cầu
│   │   ├── danh-muc/page.tsx   ⭐ quận / phường / loại hình
│   │   └── canh-bao/page.tsx   cảnh báo bảo mật + chặn fingerprint
│   └── not-found.tsx
├── components/
│   ├── SiteHeader.tsx|SiteFooter.tsx
│   ├── ListingCard.tsx         card tin + ProjectCard + WatchButton
│   ├── Pagination.tsx
│   ├── ui.tsx                  ⭐ StatCard SectionCard SectionHeader Note BarChart
│   └── admin/AdminGate.tsx     cổng đăng nhập + tab điều hướng admin
├── data/districts.ts           seed build-time — phải khớp database!
├── lib/api.ts                  toàn bộ gọi API
└── types/iconify.d.ts          khai báo JSX cho <iconify-icon>
```

---

## 6. Ba điều phải giữ đúng khi sửa code

### 6.1 `src/data/districts.ts` phải khớp bảng `admin_districts`

File này sinh 25 trang `/quan/[slug]` lúc build. Sửa tên quận trong SQL mà quên sửa ở đây
→ URL SEO cũ trả 404 **vĩnh viễn**.

### 6.2 Không gọi thẳng Supabase từ trình duyệt

Mọi lệnh gọi đi qua `src/lib/api.ts` → Worker. Gọi `supabase.co/rest/v1` trực tiếp sẽ
bỏ qua toàn bộ rate limit, Turnstile và giám sát.

### 6.3 `address_line` không được lọt vào response

Cột địa chỉ chi tiết không cấp quyền cho `anon` ở tầng database
(xem `database/004_column_grants.sql`). Trang chi tiết cố tình không hiện địa chỉ đầy đủ —
chỉ lấy qua `/api/contact/reveal` sau khi đăng nhập.

---

## 7. Lưu ý về `useSearchParams` và static export

`useSearchParams()` buộc mọi trang phải bọc trong `<Suspense>`. Nếu component dùng nó
được render từ `layout.tsx` (ví dụ `SiteHeader`), **mọi trang SSG sẽ không build được**
với lỗi *“useSearchParams() should be wrapped in a suspense boundary”*.

Cách đã dùng trong dự án: đọc query string bằng `window.location.search` trong `useEffect`.
Chỉ trang tương tác nhiều (`tim-kiem`, `chi-tiet`, `so-sanh`, `admin/…`) mới dùng
`useSearchParams` kèm `<Suspense>` riêng.

---

## 8. Trang admin

Phân quyền **không** do Worker quyết định mà thực thi ở tầng database qua Row Level
Security — kể cả khi Worker có lỗi, RLS vẫn chặn đúng.

Cấp quyền staff:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'email-cua-ban@gmail.com');
```

Đăng xuất rồi đăng nhập lại để token mang role mới.

---

## 9. Workflow deploy

`.github/workflows/deploy.yml`:

```yaml
name: Deploy Pages
on:
  push: { branches: [main] }
  workflow_dispatch:

permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: web/package-lock.json }
      - run: npm ci
        working-directory: web
      - run: npm run build
        working-directory: web
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ vars.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ vars.SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: ${{ vars.TURNSTILE_SITE_KEY }}
          NEXT_PUBLIC_SITE_URL: ${{ vars.SITE_URL }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: web/out }
      - id: deployment
        uses: actions/deploy-pages@v4
```

Đặt 5 biến trong **Settings → Secrets and variables → Actions → Variables**.

> ⚠ `API_URL` là URL Worker, **không** phải URL Supabase.
> ⚠ Chỉ đặt khoá `anon` trong biến `NEXT_PUBLIC_*` — chúng bị nhúng vào bundle
> và ai cũng xem được. `service_role key` tuyệt đối không được đưa vào biến public.

---

## 10. Checklist trước khi deploy

- [ ] `/tim-kiem/?q=quan 9` ra kết quả của Thủ Đức (kiểm tra tìm theo tên cũ)
- [ ] `/chi-tiet?slug=…` hiện giá, ảnh, thông số — **không** hiện địa chỉ đầy đủ
- [ ] Chưa đăng nhập → bấm "Xem số điện thoại" hiện nút đăng nhập
- [ ] Đăng nhập → xem SĐT thành công (Turnstile phải hoạt động)
- [ ] `/quan/thu-duc` mở được, tiêu đề SEO đúng
- [ ] `/so-sanh` bấm tim 2 tin rồi chọn → bảng so sánh hiện ra
- [ ] `/admin` chặn khi chưa đăng nhập
- [ ] View source trang chi tiết: tìm `address_line` → phải **không có**
- [ ] Trang `/lien-he` gửi form thành công