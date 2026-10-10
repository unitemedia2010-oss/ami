# KẾ HOẠCH XÂY DỰNG WEBSITE BẤT ĐỘNG SẢN TP.HCM
### Căn hộ · Chung cư · Toàn bộ dự án — Frontend + Backend + Admin + Bảo mật chống cào dữ liệu

> Bản v1 · Tháng 10/2026 · Ưu tiên: **chi phí 0đ**, dùng domain bạn đã mua

---

## 0. TRƯỚC KHI BẮT ĐẦU — 3 ĐIỀU CẦN NÓI THẲNG

### 0.1 GitHub Pages KHÔNG host được backend

GitHub Pages chỉ phục vụ **file tĩnh** (HTML/CSS/JS). Không chạy được Node.js, không có database, không có API.

| Phần | Host | Ghi chú |
|---|---|---|
| **Source code** | GitHub (private repo) | Bạn mua GitHub Pages để chứa source → phù hợp |
| **Frontend (giao diện)** | GitHub Pages | Build ra file tĩnh, push lên nhánh `gh-pages` |
| **Backend + Database** | **Supabase** (free tier) | 500MB DB, 1GB ảnh, 50.000 MAU |
| **API Gateway + chống cào** | **Cloudflare Workers** | 100.000 req/ngày miễn phí |

→ Nếu bạn muốn **server-side rendering** (SEO mạnh hơn) thì dùng **Vercel free** thay GitHub Pages. Mình đề xuất 2 phương án ở Phần 9, bạn chọn.

### 0.2 Sáp nhập hành chính 2025 — mô hình dữ liệu cũ đã lỗi thời

Từ 1/7/2025, TP.HCM (đã sáp nhập Bình Dương + Bà Rịa - Vũng Tàu) có:

- **21 đơn vị hành chính cấp huyện** (quận/huyện/thị xã)
- **168 đơn vị cấp xã**: 113 phường + 54 xã + 1 đặc khu

⚠️ Dữ liệu bất động sản trên thị trường hiện tại vẫn dùng tên cũ (quận 7 có sân bay, TP.Thủ Đức là "quận 9 mới"...). Hệ thống của bạn **phải hỗ trợ cả hai lớp tên**: tên hành chính mới (bắt buộc) + tên cũ/alias (để người dùng tìm kiếm vẫn ra kết quả).

### 0.3 Thực tế về chống cào dữ liệu — mình nói thẳng để bạn không mất tiền

**Không thể chặn 100%.** Ai xem trên trình duyệt đều có thể lấy dữ liệu hiển thị. Nếu dữ liệu hiển thị cho người dùng thì người đó *luôn có thể* lấy.

Mục tiêu đúng đắn không phải "chặn tuyệt đối" mà là:

> **Làm cho việc cào hàng loạt trở nên tốn kém, chậm, dễ bị phát hiện và bị xử lý — còn người dùng thật thì không bị phiền.**

Cách đúng là **phân tầng**, mỗi lớp một tác dụng. Bạn bỏ lớp nào thì lớp sau gánh thêm. Chi tiết ở Phần 7.

---

## 1. TỔNG QUAN KIẾN TRÚC

```
                    NGƯỜI DÙNG (trình duyệt)
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │   CLOUDFLARE  (DNS + WAF + Bot Fight)│   ← lớp chặn 1
        │   • Turnstile chống bot              │
        │   • Rate limit theo IP               │
        │   • Chặn UA/ASN datacenter           │
        └──────────────────────────────────────┘
                             │
             ┌───────────────┴───────────────┐
             ▼                               ▼
   ┌──────────────────┐          ┌────────────────────┐
   │  GITHUB PAGES    │          │ CLOUDFLARE WORKER   │ ← lớp chặn 2
   │  Frontend tĩnh   │          │ API Gateway        │
   │  (HTML/CSS/JS)   │          │ • xác thực token   │
   │                  │          │ • rate limit       │
   │  Seo, SSR/SSG    │          │ • cache            │
   └──────────────────┘          │ • KHÔNG lộ DB key │
             │                   └─────────┬──────────┘
             │                             │
             │                   ┌─────────▼──────────┐
             │                   │    SUPABASE        │ ← lớp chặn 3
             │                   │ • Postgres + RLS   │
             │                   │ • Auth             │
             │                   │ • Storage (ảnh)    │
             │                   └────────────────────┘
             │                             ▲
             └─────────────────────────────┘
                        admin đăng nhập
```

**Điểm mấu chốt:** Trình duyệt **không bao giờ** chạm trực tiếp vào Supabase.
Mọi request đi qua Worker. Đó là nơi duy nhất mình kiểm soát được rate limit và log.

---

## 2. STACK CÔNG NGHỆ (tất cả đều có free tier)

| Lớp | Công nghệ | Free tier | Vì sao chọn |
|---|---|---|---|
| Frontend | **Next.js 15 + TypeScript + Tailwind** | Vercel: 100GB bandwidth/tháng | SEO tốt nhất cho BĐS, SSG miễn phí |
| UI components | shadcn/ui + Radix | Miễn phí | Không phụ thuộc, tự sửa được |
| Bản đồ | **MapLibre GL JS** | Miễn phí, không cần token | Dùng lại được kinh nghiệm bản demo đã có |
| Backend | **Supabase** (Postgres) | 500MB DB · 1GB ảnh · 50k MAU | Có sẵn Auth, RLS, Storage |
| API Gateway | **Cloudflare Workers** | 100.000 req/ngày | Rate limit + chống bot, miễn phí |
| Chống bot | **Cloudflare Turnstile** | Miễn phí vĩnh viễn | Thay CAPTCHA ảnh, không cần xử lý ảnh |
| Deploy FE | GitHub Pages **hoặc** Vercel | Miễn phí | Tùy chọn ở Phần 9 |
| Domain | Domain bạn đã mua | — | DNS trỏ về trên |

### Ngân sách dự kiến khi free

| Hạng mục | Miễn phí đến khi |
|---|---|
| Database | 500 MB (~50.000 tin + 5.000 dự án) |
| Ảnh | 1 GB (~5.000 ảnh nén WebP ~200KB) |
| API | 100.000 req/ngày |
| Bandwidth | 5 GB/tháng (Supabase) |

⚠️ **Ảnh là nút thắt lớn nhất.** 1 GB ảnh chỉ bằng ~5.000 ảnh. Ba giải pháp (Phần 8.4): ảnh trên **imgbb/Cloudinary free tier**, hoặc **dùng domain khác bán tản**, hoặc **xem xét trả phí $5/tháng** khi site đã có người dùng.

---

## 3. MÔ HÌNH DỰ LIỆU (database schema)

### 3.1 Bảng hành chính

```sql
-- Đơn vị cấp huyện (21)
CREATE TABLE admin_districts (
  id           serial PRIMARY KEY,
  code         text UNIQUE NOT NULL,        -- 'Q1', 'THU_DUC', 'CU_CHI'
  name_new     text NOT NULL,               -- tên mới 2025: "Thành phố Thủ Đức"
  name_old     text,                        -- tên cũ: "Quận 9"
  aliases      text[] DEFAULT '{}',         -- tìm kiếm: ['quan 9','thu duc','q9']
  type         text NOT NULL,               -- 'quận' | 'huyện' | 'thị xã' | 'đặc khu'
  lat          numeric(9,6), lng numeric(9,6),
  polygon      jsonb,                       -- GeoJSON ranh giới
  sort_order   int DEFAULT 0,
  is_active    bool DEFAULT true
);

-- Đơn vị cấp xã (168)
CREATE TABLE admin_wards (
  id           serial PRIMARY KEY,
  district_id  int REFERENCES admin_districts(id),
  code         text UNIQUE NOT NULL,        -- 'TT01'
  name_new     text NOT NULL,               -- "Phường Thủ Thiêm"
  name_old     text,
  aliases      text[] DEFAULT '{}',
  lat          numeric(9,6), lng numeric(9,6),
  is_active    bool DEFAULT true
);
CREATE INDEX idx_wards_district ON admin_wards(district_id);

-- Đường / phố (để lọc theo đường như site đối thủ)
CREATE TABLE admin_streets (
  id           serial PRIMARY KEY,
  ward_id      int REFERENCES admin_wards(id),
  name         text NOT NULL,
  slug         text UNIQUE NOT NULL,        -- 'mai-chi-tho'
  aliases      text[] DEFAULT '{}',         -- ['mai chí thọ','maichi tho','mct']
  lat          numeric(9,6), lng numeric(9,6)
);
```

> **Bí quyết tìm kiếm:** cột `aliases` + GIN index trên `to_tsvector`. Người dùng gõ "quận 9", "q9", "thu đức", "mai chi tho" → đều ra kết quả đúng, vì đã chuẩn hoá không dấu + lowercase.

### 3.2 Bảng dự án

```sql
CREATE TABLE projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text UNIQUE NOT NULL,          -- 'the-metropole-thu-thiem'
  name           text NOT NULL,                 -- "The Metropole Thủ Thiêm"
  old_names      text[] DEFAULT '{}',
  developer      text,                          -- chủ đầu tư
  address        text,
  ward_id        int REFERENCES admin_wards(id),
  district_id    int REFERENCES admin_districts(id),
  street_id      int REFERENCES admin_streets(id),
  lat            numeric(9,6), lng numeric(9,6),  -- điểm chính
  polygon        jsonb,                          -- ranh giới dự án

  building_count int,                            -- số toà nhà
  apartment_count int,                           -- số căn hộ
  description    text,
  highlights     text,                           -- "3PN · view sông · full nội thất"

  -- tiện ích: array để lọc nhanh, không cần bảng EAV
  amenities      text[] DEFAULT '{}',
  -- ['hồ bơi','gym','spa','trường học','công viên','bbq','hầm xe','sân tennis']

  hero_image     text,
  gallery        text[] DEFAULT '{}',
  video_url      text,
  is_published   bool DEFAULT false,
  published_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),

  -- chống cào: đếm lượt xem
  view_count_7d  int DEFAULT 0,
  seo_title      text, seo_description text
);

CREATE INDEX idx_projects_ward    ON projects(ward_id);
CREATE INDEX idx_projects_district ON projects(district_id);
CREATE INDEX idx_projects_name    ON projects USING gin(
  to_tsvector('simple', name || ' ' || array_to_string(old_names,' '))
);
CREATE INDEX idx_projects_amenity ON projects USING gin(amenities);
```

### 3.3 Bảng tin bán / cho thuê

```sql
CREATE TYPE listing_type  AS ENUM ('sell','rent');
CREATE TYPE listing_status AS ENUM ('draft','pending','published','expired','hidden');

CREATE TABLE listings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text UNIQUE NOT NULL,   -- 'PR-000123' (nội bộ, không đoán được theo ID)
  slug           text UNIQUE NOT NULL,

  type           listing_type NOT NULL,
  status         listing_status NOT NULL DEFAULT 'draft',
  project_id     uuid REFERENCES projects(id) ON DELETE SET NULL,
  tower_name     text,                  -- "Toà E1"

  -- địa chỉ
  title          text NOT NULL,
  ward_id        int REFERENCES admin_wards(id),
  district_id    int REFERENCES admin_districts(id),
  street_id      int REFERENCES admin_streets(id),
  address_line   text,                  -- chỉ hiện khi đã xem, không nằm trong list API

  -- tiền
  price          numeric(14,2) NOT NULL,        -- LUÔN tính bằng TRIỆU
  price_unit     text GENERATED ALWAYS AS (
                   CASE WHEN price >= 1000 THEN 'tỷ' ELSE 'triệu' END
                 ) STORED,
  price_monthly  numeric(12,2),                -- chỉ dùng khi type='rent'
  currency       text DEFAULT 'VND',
  negotiable     bool DEFAULT false,

  -- mô tả vật lý
  area           numeric(8,2),      -- m²
  bedrooms       int,               -- số phòng ngủ
  bathrooms      int,
  floors         int,
  direction      text,              -- 'Đông Nam'
  furniture      text,              -- 'Đầy đủ'
  floor_number   int,               -- tầng thực tế
  features       text[] DEFAULT '{}',
  description    text,
  video_url      text,

  images         text[] DEFAULT '{}',
  status_note    text,

  -- quản lý
  agent_id       uuid REFERENCES profiles(id),
  priority       int DEFAULT 0,     -- tin đẩy lên đầu
  is_featured    bool DEFAULT false,
  published_at   timestamptz,
  expires_at     timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),

  -- chống cào
  view_count     int DEFAULT 0,
  view_count_7d  int DEFAULT 0,
  unique_viewers_7d int DEFAULT 0
);

CREATE INDEX idx_listings_browse   ON listings(status, type, district_id, price DESC)
  WHERE status = 'published';
CREATE INDEX idx_listings_project  ON listings(project_id) WHERE status='published';
CREATE INDEX idx_listings_recent   ON listings(published_at DESC) WHERE status='published';
CREATE INDEX idx_listings_price    ON listings(price) WHERE status='published';
CREATE INDEX idx_listings_search   ON listings USING gin(
  to_tsvector('simple',
    coalesce(title,'') || ' ' ||
    coalesce(address_line,'') || ' ' ||
    coalesce(project_id::text,''))
);
```

> ⚠️ **`address_line` (số nhà, số căn hộ) cố tình KHÔNG nằm trong API list.** Chỉ trả khi đã đăng nhập + đã bấm xem chi tiết. Đây là dữ liệu nhạy cảm nhất về nhà ở.

### 3.4 ⭐ Bảng thông tin liên hệ — TÁCH RIÊNG, KHÓA CHẶT

**Đây là phần quan trọng nhất của toàn bộ hệ thống bảo mật.**

```sql
CREATE TABLE listing_contacts (
  listing_id     uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,

  -- PII: cột này BỊ CHẶN HOÀN TOÀN với role anon
  contact_name   text,
  contact_phone  text,
  contact_zalo   text,
  contact_email  text,

  -- lưu riêng để đổi quyền truy cập không phải sửa schema
  unlocked_by    uuid[] DEFAULT '{}'   -- user đã trả tiền để xem tin này
);
```

**Quy tắc bất di bất dịch:**
1. Bảng này **không bao giờ** được join vào query danh sách.
2. Không có endpoint nào trả cả listing + contact trong một lần gọi.
3. Số điện thoại hiển thị **dạng che** mặc định: `0903 ••• •••`.
4. Chỉ hiện đủ khi: đăng nhập + đã mua quyền xem tin đó + còn trong hạn.

### 3.5 Bảng người dùng & phân quyền

```sql
CREATE TYPE user_role AS ENUM ('guest','customer','agent','editor','admin','super_admin');

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role DEFAULT 'customer',
  full_name   text,
  phone       text,
  avatar      text,
  agency      text,                     -- công ty môi giới
  commission_rate numeric(4,2),         -- % hoa hồng
  credit_balance int DEFAULT 0,         -- số xu mua quyền xem SĐT
  is_verified bool DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
```

Phân quyền Admin:

| Quyền | Customer | Agent | Editor | Admin | Super |
|---|:--:|:--:|:--:|:--:|:--:|
| Xem tin đã publish | ✓ | ✓ | ✓ | ✓ | ✓ |
| Đăng tin của mình | ✓ | ✓ | — | — | — |
| Sửa tin của mình | ✓ | ✓ | — | — | — |
| Duyệt tin | — | — | ✓ | ✓ | ✓ |
| Sửa **mọi** tin | — | — | — | ✓ | ✓ |
| Thêm/sửa dự án | — | — | ✓ | ✓ | ✓ |
| Xem SĐT chủ tin | mua | mua | ✓ | ✓ | ✓ |
| Quản lý user | — | — | — | ✓ | ✓ |
| Xem log, thống kê | — | — | — | ✓ | ✓ |
| Xóa vĩnh viễn | — | — | — | — | ✓ |

### 3.6 Bảng chống lạm dụng & audit

```sql
-- Mỗi lần người dùng xem SĐT (dù miễn phí hay trả phí)
CREATE TABLE contact_reveals (
  id          bigserial PRIMARY KEY,
  listing_id  uuid NOT NULL REFERENCES listings(id),
  user_id     uuid REFERENCES auth.users(id),
  ip_hash     text,                    -- hash IP + secret, KHÔNG lưu IP gốc
  user_agent  text,
  method      text,                    -- 'free_quota' | 'purchased' | 'admin'
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX idx_reveals_user_24h ON contact_reveals(user_id, created_at DESC);
CREATE INDEX idx_reveals_listing  ON contact_reveals(listing_id);

-- Phát hiện bất thường: IP nào đọc quá nhiều trong ngắn thời gian
CREATE TABLE access_alerts (
  id          bigserial PRIMARY KEY,
  alert_type  text,      -- 'rate_limit' | 'honeypot' | 'canary' | 'enumeration'
  fingerprint text,      -- hash(ip + ua)
  detail      jsonb,
  ip_hash     text,
  severity    text,      -- 'low'|'medium'|'high'
  created_at  timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Ai sửa gì, dùng Row Level Security để admin không sửa được log
CREATE TABLE audit_logs (
  id          bigserial PRIMARY KEY,
  actor_id    uuid REFERENCES auth.users(id),
  action      text,      -- 'listing.update' | 'contact.view' | 'user.role_change'
  target_type text, target_id text,
  before_data jsonb, after_data jsonb,
  ip_hash     text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
```

---

## 4. FRONTEND — GIAO DIỆN

### 4.1 Sơ đồ trang

```
TRANG CÔNG KHAI (SEO — cần index)
├── /                          Trang chủ: dự án nổi bật + tin mới
├── /du-an                     Danh sách 100% dự án, lọc theo 21 quận/huyện
│   └── /du-an/[slug]          Chi tiết dự án: toà nhà, tiện ích, bản đồ, tin của dự án
├── /nha-dat-tphcm             Tất cả tin · lọc 168 phường/xã
│   └── /[type]/               /ban  ·  /cho-thue
├── /quan/[slug]               Tin theo quận/huyện (21 trang) — trang SEO quan trọng nhất
├── /phuong/[slug]             Tin theo phường/xã (168 trang)
├── /duong/[slug]              Tin theo đường (~2.000 trang)
├── /tim-kiem?q=...            Trang tìm kiếm (noindex, dùng robots meta)
├── /lien-he/[slug]            Hồ sơ agent đăng tin
└── /dang-tin                  Gửi yêu cầu đăng tin (qua Turnstile)

TÀI KHOẢN KHÁCH
├── /dang-nhap · /dang-ky · /xac-thanh-email · /quen-mat-khau
├── /tai-khoan                 Thông tin cá nhân
├── /tin-luu                  Danh sách tin đã lưu
└── /so-du                    Mua quyền xem SĐT (nạp credit)

ADMIN  (/admin/*) — bảo mật ở Phần 7.3
├── /admin                     Dashboard
├── /admin/listings            Danh sách tin · thêm/sửa/xoá
├── /admin/projects            Danh sách dự án · thêm/sửa/xử lý
├── /admin/wards · /streets    Đơn vị hành chính & đường phố
├── /admin/leads               Hộp thư liên hệ · phân công agent
├── /admin/users               Người dùng, phân quyền, nạp credit
├── /admin/alerts              Cảnh báo bất thường  ← quan trọng
└── /admin/settings            Cấu hình site, giá credit
```

### 4.2 Trang chi tiết tin — thiết kế 2 bậc

Đây là chốt chặn cào dữ liệu chính, dùng **progressive disclosure**:

```
┌─────────────────────────────────────────────────────────┐
│ BẬC 1: ai cũng xem được (không cần đăng nhập)           │
│  • Ảnh, tiêu đề, dự án, quận/phường, đường            │
│  • GIÁ · diện tích · số PN · WC · tầng · hướng         │
│  • Tiện ích dự án · mô tả (cắt 300 ký tự)              │
│  • Ảnh nhỏ dự án, bản đồ                               │
│  • ⚠️ KHÔNG có: số nhà cụ thể, số điện thoại, tên chủ  │
│  → Toàn bộ nội dung nằm trong 1 request, nhưng KHÔNG    │
│    chứa PII. Cào 10.000 trang cũng không có gì để lấy.  │
└─────────────────────────────────────────────────────────┘
                          ↓ bấm "Xem thông tin liên hệ"
┌─────────────────────────────────────────────────────────┐
│ BẬC 2: có kiểm soát                                       │
│  • Turnstile xác minh người                              │
│  • Đăng nhập (bắt buộc)                                  │
│  • Trừ 1 credit, ghi vào contact_reveals                │
│  • Trả: tên (che 1 chữ cá nhân) + SĐT che + địa chỉ đầy đủ│
│  • Giới hạn 5 lượt/ngày/user (mặc định miễn phí)         │
│  • Đếm chống cào theo IP, UA, fingerprint               │
└─────────────────────────────────────────────────────────┘
```

> **Chốt chặn:** Người muốn cào SĐT phải vượt Turnstile + đăng nhập + bị tính phí.
> Chi phí cho kẻ cào = 5 lượt/ngày/tài khoản × N tài khoản × Turnstile.
> Không còn "1 request = 1 số điện thoại".

### 4.3 Trang danh sách — chống cào bằng công thức

```
Trang chủ / trang danh sách (bất kỳ)
  └─ 24 tin / trang
  └─ response chỉ gồm 8 trường:
     { id, slug, title, price, price_unit, area, bedrooms,
       ward_name, district_name, image, project_name, published_at }
  └─ KHÔNG có: address_line, contact_*, tên chủ, mô tả dài
  └─ Trang > 100 → phân trang con (sitemap)

SEO: mỗi trang lọc là 1 URL riêng
  /quan/1 · /quan/4 · /phuong/thu-thiem · /du-an/the-metropole
  → Google index được, scraper khó gom hết 1 lần

Chống enumeration: KHÔNG bao giờ đưa id tăng dần ra URL
  ✗ /listing/1  /listing/2  /listing/3    → cào tuần tự là hết DB
  ✓ /listing/pr-8f3a9c2b-chung-cu-2pn-thu-thiem
  ✓ id = UUID v4 (không đoán được)
```

---

## 5. BACKEND

### 5.1 Cấu trúc API (tất cả qua Cloudflare Worker)

```
PUBLIC (không cần đăng nhập)
GET  /api/listings?type=rent&district=thu-duc&min=10&max=30&page=1
     → { data:[...], total, page, took_ms }
     → KHÔNG chứa PII
GET  /api/listings/:slug          → chi tiết bậc 1
GET  /api/projects?district=&q=   → danh sách dự án
GET  /api/projects/:slug
GET  /api/admin-units             → 21 quận/huyện + 168 phường (cache 24h)
GET  /api/search?q=               → tìm kiếm

KHÁCH (cần đăng nhập)
POST /api/auth/register · /api/auth/login · /api/auth/refresh
GET  /api/me
POST /api/listings                → đăng tin
PATCH /api/listings/:id           → sửa tin của mình
GET  /api/saved                   → tin đã lưu
POST /api/saved/:listingId

XEM SĐT (đăng nhập + Turnstile + giới hạn)
POST /api/contact/reveal          → body: { listingId, turnstileToken }
     → kiểm tra rate limit
     → kiểm tra credit
     → ghi contact_reveals
     → trả contact (che một phần)
GET  /api/contact/history         → lịch sử đã xem

ADMIN (role trong JWT)
GET/POST/PATCH/DELETE  /api/admin/listings/:id
GET/POST/PATCH/DELETE  /api/admin/projects/:id
GET                   /api/admin/leads
GET                   /api/admin/alerts
GET                   /api/admin/stats
```

### 5.2 Ví dụ Worker: kiểm soát lộ lọt & chống cào

```js
// workers/api/src/index.js
export default {
  async fetch(request, env, ctx) {
    const ip   = request.headers.get('CF-Connecting-IP');
    const ua   = request.headers.get('User-Agent') || '';
    const fp   = await fingerprint(ip, ua, env);      // hash HMAC
    const url   = new URL(request.url);
    const path  = url.pathname;

    // 1) CHẶN BOT — UA rỗng, công cụ cào, ASN datacenter
    if (await isBot(ua, ip, env)) {
      await logAlert(env, 'bot_detected', fp, ip);
      return json({ error: 'Forbidden' }, 403);
    }

    // 2) RATE LIMIT — token bucket trên KV
    const limit = path.startsWith('/api/contact')
      ? { n: 10,  win: 3600 }     // SĐT: 10 lượt/giờ/IP
      : path.startsWith('/api/listings')
      ? { n: 120, win: 3600 }     // list: 120 req/giờ/IP
      : { n: 600, win: 3600 };    // mặc định

    const rl = await checkRate(fp, limit, env);
    if (!rl.ok) {
      return json({ error: 'Rate limit', retry_after: rl.retryAfter },
                  429, { 'Retry-After': String(rl.retryAfter) });
    }

    // 3) TURNSTILE — bắt buộc với mọi thao tác nhạy cảm
    if (path.startsWith('/api/contact') || path === '/api/listings') {
      const token = request.headers.get('X-Turnstile-Token');
      if (!token || !(await verifyTurnstile(token, ip, env))) {
        return json({ error: 'Human verification failed' }, 403);
      }
    }

    // 4) GỌI SUPABASE — dùng service_role KEY CỦA SERVER
    //    Key này KHÔNG BAO GIỜ trả về trình duyệt
    const supabase = createClient(env.SB_URL, env.SERVICE_ROLE_KEY);
    const { data: user } = await verifyJwt(request, env);

    // 5) LOG mọi lần xem SĐT
    if (path.startsWith('/api/contact/reveal')) {
      const { listingId } = await request.json();
      const res = await revealContact({ supabase, user, ip, ua, listingId, env });
      return json(res.data, res.status);
    }

    // 6) CACHE — giảm tải DB + giảm tải cho bạn
    const cacheKey = `api:${path}:${url.search}`;
    const cached = await env.CACHE.get(cacheKey);
    if (cached) return new Response(cached, {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });

    const body = await handleRequest({ supabase, user, path, url, request, env });
    if (body && body.cacheable) {
      ctx.waitUntil(env.CACHE.put(cacheKey, JSON.stringify(body.data)));
    }
    return json(body.data, body.status);
  }
};
```

### 5.3 Hàm `revealContact` — trái tim bảo mật

```js
async function revealContact({ supabase, user, ip, ua, listingId, env }) {
  // A. Phải đăng nhập
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };

  // B. Tin có tồn tại và đang publish không
  const { data: listing } = await supabase
    .from('listings').select('id,agent_id')
    .eq('id', listingId).eq('status', 'published').single();
  if (!listing) return { status: 404, data: { error: 'Not found' } };

  // C. Giới hạn theo USER: 5 lượt/ngày (chống tạo nhiều tài khoản)
  const today = new Date(); today.setHours(0,0,0,0);
  const { count: usedToday } = await supabase
    .from('contact_reveals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', today.toISOString());

  const FREE_QUOTA = 5;
  if (usedToday >= FREE_QUOTA) {
    if (!user.credit_balance || user.credit_balance <= 0) {
      await logAlert(env, 'quota_exhausted', user.id, ip);
      return { status: 402, data: { error: 'Hết lượt miễn phí. Vui lòng nạp credit.' } };
    }
  }

  // D. Trừ credit — dùng hàm RPC nguyên tử trong DB (chống race condition)
  if (usedToday >= FREE_QUOTA) {
    const { data: ok } = await supabase.rpc('spend_credit', {
      p_user_id: user.id, p_amount: 1
    });
    if (!ok) return { status: 402, data: { error: 'Không đủ credit' } };
  }

  // E. Ghi log TRƯỚC khi trả dữ liệu
  await supabase.from('contact_reveals').insert({
    listing_id: listingId, user_id: user.id,
    ip_hash: await hashIp(ip), user_agent: ua, method: 'quota_or_purchased'
  });

  // F. Trả dữ liệu — che một phần số điện thoại
  const { data: contact } = await supabase
    .from('listing_contacts').select('*').eq('listing_id', listingId).single();

  return {
    status: 200,
    data: {
      contactName: maskName(contact.contact_name),      // "Nguyễn Văn A" → "Nguyễn V. A"
      phone: maskPhone(contact.contact_phone),           // "0903123456" → "090312•••56"
      phoneFull: contact.contact_phone,                 // chỉ trả nếu đã mua
      addressFull: contact.full_address,
      remaining: Math.max(0, FREE_QUOTA - usedToday - 1),
    }
  };
}

const maskPhone = p => p ? p.slice(0,6) + '•••' + p.slice(-2) : null;
const maskName  = n => n ? n.split(' ').map((w,i) =>
                        i === 0 ? w : (w[0] + '•'.repeat(w.length-1))
                      ).join(' ') : null;
```

**Điểm mấu chốt:** `spend_credit` là **function trong database** (Postgres), không phải `UPDATE ... balance = balance - 1` từ client. Đây là cách duy nhất chống được race condition — hai request song song không thể cùng tiêu 1 credit.

```sql
-- migrations/003_credit.sql
CREATE OR REPLACE FUNCTION spend_credit(p_user_id uuid, p_amount int)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cur int;
BEGIN
  -- khóa dòng: chặn 2 transaction cùng lúc
  SELECT credit_balance INTO cur FROM profiles
   WHERE id = p_user_id FOR UPDATE;

  IF cur < p_amount THEN RETURN false; END IF;

  UPDATE profiles SET credit_balance = cur - p_amount WHERE id = p_user_id;
  INSERT INTO credit_transactions(user_id, amount, reason) VALUES
         (p_user_id, -p_amount, 'reveal_contact');
  RETURN true;
END; $$;
```

### 5.4 Row Level Security — lớp phòng thủ cuối

Dù Worker có bị lọt, RLS vẫn chặn được:

```sql
-- listings: ai cũng đọc được tin đã publish
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published" ON listings
  FOR SELECT USING (status = 'published');

CREATE POLICY "owner_update_own" ON listings
  FOR UPDATE USING (auth.uid() = agent_id);

-- listing_contacts: KHÔNG có policy nào cho role anon
ALTER TABLE listing_contacts ENABLE ROW LEVEL SECURITY;
-- → anon key của trình duyệt không đọc được bảng này, dù có bị lộ

-- Chỉ service_role (chạy trong Worker) mới bypass được
-- profiles: không ai sửa được role của chính mình
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Không có policy UPDATE → user tự nâng mình lên admin KHÔNG được
```

> **Nguyên tắc:** Supabase có 2 loại key. `anon` key được nhúng trong trình duyệt (bình thường, ai cũng thấy). `service_role` key **chỉ nằm trong biến môi trường của Cloudflare Worker**. Key thứ hai phải được revoke nếu bị lộ.

---

## 6. TRANG ADMIN

### 6.1 Cấu trúc thư mục

```
admin/
├── layout.tsx                    # kiểm tra role, điều hướng
├── page.tsx                      # Dashboard
├── listings/
│   ├── page.tsx                  # bảng: lọc, sắp xếp, bulk action
│   ├── [id]/page.tsx             # sửa tin
│   ├── new/page.tsx              # thêm tin
│   └── components/
│       ├── ListingForm.tsx       # form chính
│       ├── ImageUploader.tsx     # kéo-thả, nén WebP trước khi upload
│       ├── WardPicker.tsx        # chọn 21 quận → 168 phường (cascading)
│       ├── ProjectPicker.tsx     # autocomplete dự án, tự điền địa chỉ
│       ├── PriceInput.tsx        # nhập "15" → hiện "15 triệu/tháng"
│       └── PublishDialog.tsx     # cảnh báo trùng tin
├── projects/                     # CRUD dự án
│   ├── page.tsx · [id]/page.tsx · new/page.tsx
│   └── components/
│       ├── ProjectForm.tsx
│       ├── AmenityPicker.tsx     # chọn tiện ích
│       ├── MapPicker.tsx         # click bản đồ đặt toạ độ
│       ├── TowerManager.tsx      # quản lý danh sách toà nhà
│       └── GalleryUploader.tsx
├── wards/                        # 21 + 168 đơn vị
│   ├── page.tsx · [id]/page.tsx
│   └── components/AliasEditor.tsx  # sửa tên cũ, viết tắt
├── streets/                      # quản lý đường phố
├── users/
│   ├── page.tsx                  # danh sách, đổi role
│   └── [id]/page.tsx
│   └── components/CreditManager.tsx  # nạp/trừ credit thủ công
├── leads/
│   ├── page.tsx                  # hộp thư liên hệ
│   └── [id]/page.tsx
│   └── components/AssignModal.tsx
├── alerts/                       # ⚠️ cảnh báo bất thường
│   ├── page.tsx
│   └── [id]/page.tsx
│   └── components/BlockIPButton.tsx
├── audit/                        # xem log thay đổi
│   └── page.tsx
└── settings/
    └── page.tsx                  # giá credit, cấu hình site, SEO
```

### 6.2 Danh sách tin — đầy đủ tính năng

| Tính năng | Chi tiết |
|---|---|
| Bộ lọc | Tìm kiếm, trạng thái, loại (bán/thuê), quận, dự án, ngày đăng, agent |
| Sắp xếp | Mới nhất, giá ↑↓, lượt xem, tin đẩy |
| Lọc nhanh | Tab: `Chờ duyệt (12)` · `Sắp hết hạn (5)` · `Ảnh lỗi (3)` |
| Thao tác hàng loạn | Chọn nhiều → duyệt / ẩn / xoá / đổi giá |
| Xuất CSV | Theo bộ lọc hiện tại |
| Nhập hàng loạn | Upload CSV → xem trước → báo lỗi dòng → import |
| Kiểm tra trùng | Cảnh báo khi tiêu đề/giá/vị trí gần giống tin cũ |
| Kiểm tra chất lượng | Ảnh < 600px, thiếu diện tích, thiếu dự án |

### 6.3 Form thêm/sửa tin

**Chia 3 tab để không choáng:**

```
┌─ TAB 1: THÔNG TIN CHÍNH ─────────────────────────────────┐
│ Loại tin      [Bán ▾ / Cho thuê ▾]                       │
│ Dự án         [🔍 The Metropole Thủ Thiêm  ×]  ← tự điền  │
│ Toà nhà       [E1 ▾]   ← chỉ hiện khi đã chọn dự án      │
│ Tiêu đề       [Căn hộ 2PN Thủ Thiêm, view sông, 15tr/tg]  │
│ Quận/Huyện    [TP. Thủ Đức ▾]                            │
│ Phường/Xã     [Phường Thủ Thiêm ▾]  ← lọc theo quận     │
│ Đường         [Mai Chí Thọ ▾]                             │
│ Số nhà/căn    [123]  ⚠️ CHỈ HIỆN Ở BẬC 2, không có trong API│
└──────────────────────────────────────────────────────────┘
┌─ TAB 2: GIÁ & ĐẶC ĐIỂM ─────────────────────────────────┐
│ Giá           [15] triệu  [/tháng ▾]  ← đơn vị tự động   │
│ Diện tích     [80] m²                                    │
│ PN · WC       [2 ▾] [2 ▾]                               │
│ Tầng          [12 ▾]   Hướng  [Đông Nam ▾]              │
│ Nội thất      [Đầy đủ ▾]   Tình trạng [▾]                │
│ Tiện ích      [☐ Hồ bơi ☐ Gym ☐ Công viên ...]          │
└──────────────────────────────────────────────────────────┘
┌─ TAB 3: ẢNH & MÔ TẢ ────────────────────────────────────┐
│ [Kéo thả ảnh vào đây]  → tự nén WebP, tự resize       │
│ Ảnh đại diện (kéo để sắp thứ tự)                       │
│ [Link video YouTube]                                    │
│ Mô tả         [rich text editor]                        │
│ SEO           [tiêu đề] [mô tả] [từ khóa]  [điểm SEO:78]  │
└──────────────────────────────────────────────────────────┘

                [Lưu nháp]  [Gửi duyệt]  [Xem trước]
```

**Tính năng admin giúp giảm rủi ro pháp lý:**
- Cảnh báo từ khóa bị cấm (`chính chủ` nếu ai đó không phải CTV)
- Bắt buộc xác nhận khi đăng tin "chính chủ" → lưu `verified_ownership` + tài liệu
- Nút "Ẩn tin" thay vì xoá (giữ dữ liệu, giảm rủi ro pháp lý khiếu nại)

---

## 7. BẢO MẬT & CHỐNG CÀO DỮ LIỆU

### 7.0 Nguyên tắc: 4 tầng, không tầng nào chặn 100%

| Tầng | Tên | Chặn được gì | Chi phí vận hành |
|---|---|---|---|
| 1 | **Pháp lý & minh bạch** | Bot chơi tròc hề, và tạo tiền lý do chặn | ~0 |
| 2 | **Kiến trúc** | Scrape không hữu ích | 0 |
| 3 | **Edge / Cloudflare** | Scrape ồ ạt tự động | Rẻ |
| 4 | **Ứng dụng & phát hiện** | Scrape tinh vi, người thật lạm dụng | Tốn công nhất |

---

### TẦNG 1 — PHÁP LÝ & MINH BẠCH (làm trước tiên, gần như miễn phí)

| # | Việc | Chi tiết |
|---|---|---|
| 1.1 | `robots.txt` | Chặn bot rõ ràng + `Crawl-delay: 10` + khai báo API path không nên crawl |
| 1.2 | Điều khoản sử dụng | Cấm cào dữ liệu hàng loạt, cấm sao chép SĐT, quyền định vị |
| 1.3 | Chính sách bảo mật | Nêu rõ ai thu thập gì, mục đích, cách liên hệ khiếu nại |
| 1.4 | DMCA | Công cụ khiếu nại — dành cho khi bị cào |
| 1.5 | Số liệu liên hệ hiển thị | Nêu rõ số tin đang có. Trang lớn bị đoán nhiều hơn trang nhỏ — đây là quyền lực đàm phán |

---

### TẦNG 2 — KIẾN TRÚC (quan trọng nhất, chống ở gốc)

| # | Biện pháp | Chặn được gì |
|---|---|---|
| 2.1 | **Tách PII khỏi bảng tin** | Bảng `listing_contacts` tách riêng, RLS chặn anon. Cào hết API list cũng **không có SĐT nào** |
| 2.2 | **API list không chứa PII** | Response chỉ 12 trường công khai. Không có `address_line`, `contact_*` |
| 2.3 | **Không lộ Supabase key** | `service_role` chỉ ở Worker. `anon` key bị RLS bảo vệ |
| 2.4 | **UUID v4 cho id** | Không đoán/enumerate được. URL dạng `/listing/1`,`/2` là tự mời cào |
| 2.5 | **Slug mô tả thay vì id** | `pr-8f3a-chung-cu-2pn-thu-thiem`. Người cào phải thu thập URL trước |
| 2.6 | **Search qua Worker** | Không cho trình duyệt gọi thẳng PostgREST. Kiểm soát được nhịp độ |
| 2.7 | **Ảnh qua URL có chữ ký** | `/img?token=<hmac>&exp=<ts>`. Không lộ bucket gốc, hết hạn sau 24h |
| 2.8 | **Không có pagination tới 10.000** | Giới hạn `page <= 100`. Cào > 100 trang sẽ phải lặp lại |
| 2.9 | **Không đưa PII vào Analytics** | GTM/GA không được nhận SĐT, tên chủ. Tránh rò ra bên thứ ba |
| 2.10 | **Kiểm tra referer cho API nhạy cảm** | `/api/contact/reveal` chỉ nhận từ domain của bạn |

---

### TẦNG 3 — CLOUDFLARE (chặn bot tự động)

| # | Cấu hình | Cách làm | Chặn được gì |
|---|---|---|---|
| 3.1 | **WAF Rate Limiting Rules** | Dashboard → Security → WAF. Giới hạn 120 req/phút/IP cho `/api/listings` | Scrape ồ ạt bằng script |
| 3.2 | **Bot Fight Mode** | Bật trong Security → Bots | Bot rõ ràng (python-requests, scrapy…) |
| 3.3 | **Chặn theo User-Agent** | WAF rule: chặn `curl`, `wget`, `python-requests`, `scrapy`, `headlesschrome` | Script cào phổ biến |
| 3.4 | **Chặn ASN** | Chặn datacenter của AWS/GCP/Azure/DigitalOcean | Scrape chạy trên VPS |
| 3.5 | **Turnstile** | Miễn phí, không cần ảnh CAPTCHA, không cần server xử lý | Bot tự động |
| 3.6 | **Rate Limit theo IP ở Worker** | Token bucket trên Cloudflare KV | Kẻ đổi IP cũng bị giới hạn theo hành vi |
| 3.7 | **Cache bật** | CDN cache cho GET API công khai | Request cào bị "rơi" vào cache, không chạm DB |

**Điểm mấu chốt của Turnstile so với reCAPTCHA:** Turnstile không cần người dùng chọn ảnh, không cần code xử lý, và chấp nhận token trong <1 giây. Người thật gần như không cảm nhận, bot thì khó vượt.

---

### TẦNG 4 — ỨNG DỤNG & PHÁT HIỆN (phức tạp nhất)

#### 4.1 Honeypot URL — bẫy rất hiệu quả, gần như miễn phí

```js
// Worker: các URL không tồn tại — đặt link ẩn trong HTML cho bot thấy
const HONEYPOTS = [
  '/listing/all-export',
  '/api/v1/export-listings',
  '/data/dump.json',
  '/sitemap-listings.xml?all=1',
  '/admin/export',         // URL thật nhưng không ai điền tay bấm
];

if (HONEYPOTS.includes(path)) {
  await logAlert(env, 'honeypot_hit', fp, ip, { path });
  // Trả về 404 — KHÔNG báo "bị phát hiện"
  return new Response('Not Found', { status: 404 });
}
```

```html
<!-- Đặt trong footer/HTML, ẩn bằng CSS cho người, bot không đọc CSS -->
<a href="/listing/all-export" style="position:absolute;left:-9999px"
   aria-hidden="true">Download</a>
```

> Bot tự động đi theo mọi link tìm thấy. Người dùng thật không thấy, không bấm.
> URL nào bị gọi → biết ngay đang bị cào, và có bằng chứng để khiếu nại.

#### 4.2 Canary record — phát hiện rò rỉ

```sql
-- Chèn 1 bản ghi "mồi" vào bảng listings, nhìn thấy hoàn toàn bình thường
-- nhưng chứa mã định danh riêng. Nếu mã này xuất hiện ở site khác
-- → biết chắc dữ liệu đã bị lấy để đăng lại.
INSERT INTO listings (slug, title, area, bedrooms, price, status)
VALUES ('canary-probe-9f3a2b', 'Căn hộ 2PN tại Vinhomes Central Park', 72, 2, 22, 'published');
```

```js
// Worker: gắn marker vào mọi response chứa bản ghi canary
if (listing.slug.startsWith('canary-probe-')) {
  body.data[0]._trace = '9f3a2b';   // dấu vết riêng, dễ tìm khi bị đăng lại
}
```

#### 4.3 Phát hiện thái độ xem bất thường

```js
// Worker: phân tích hành vi
async function detectAbnormal({ fp, ip, userAgent, path, env }) {
  const window = 3600; // 1 giờ
  const stats = await getStats(fp, window, env);

  const signals = [];

  // 1) Xem quá nhiều trang chi tiết mà không có đăng nhập
  if (stats.detailViews > 60) signals.push('high_detail_view_rate');

  // 2) Xem đúng thứ tự tuần tự (dấu hiệu script)
  if (stats.sequentialRate > 0.9) signals.push('sequential_crawl');

  // 3) Truy cập SĐT quá nhiều
  if (stats.revealAttempts > 10) signals.push('reveal_abuse');

  // 4) Duyệt đủ mọi phường
  if (stats.distinctWards > 40) signals.push('ward_sweep');

  // 5) Không tương tác (không cuộn, không click) — chỉ lấy HTML
  if (stats.avgDwellMs < 400 && stats.detailViews > 20) signals.push('no_engagement');

  // 6) Nhiều listing khác dùng cùng 1 tài khoản (nuôi tài khoản để xem SĐT hàng loạt)
  if (stats.duplicatesFromSameAgent > 5) signals.push('duplicate_posting');

  return signals;
}
```

Khi có tín hiệu → ghi vào `access_alerts` → **hiện cảnh báo trong admin** → bạn tự quyết định xử lý.

#### 4.4 Bảng cảnh báo trong admin

| Cảnh báo | Mức | Hành động gợi ý |
|---|---|---|
| `high_detail_view_rate` | 🔴 Cao | Chặn IP 24h, kiểm tra có phải đối thủ không |
| `sequential_crawl` | 🟡 TB | Rate limit chặt hơn cho fingerprint đó |
| `reveal_abuse` | 🔴 Cao | Khoá tính năng xem SĐT, yêu cầu xác minh |
| `honeypot_hit` | 🔴 Cao | Có bằng chứng cào → lưu lại để khiếu nại DMCA |
| `ward_sweep` | 🟡 TB | Nghi vòi thu thập toàn bộ dữ liệu |
| `duplicate_posting` | 🟠 TB | Có thể là spam hoặc nhân bản từ site khác |

#### 4.5 Chống nhân bản tin đăng

```sql
-- Tính vân tay nội dung để phát hiện tin bị copy từ site khác
ALTER TABLE listings ADD COLUMN content_hash text;

-- md5(giá + diện tích + ảnh đầu tiên + mô tả đã chuẩn hoá)
-- Nếu trùng hash ở nhiều tài khoản → cảnh báo
CREATE INDEX idx_listings_hash ON listings(content_hash);

CREATE OR REPLACE FUNCTION check_duplicate_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_hash := md5(
    NEW.price::text || '|' || NEW.area::text || '|' ||
    NEW.bedrooms::text || '|' ||
    coalesce(NEW.description,'') || '|' ||
    coalesce(NEW.images[1], '')
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql;
```

#### 4.6 Những cách **KHÔNG** nên dùng (vì vô hiệu)

| Cách | Tại sao vô dụng |
|---|---|
| Disable F12 / cấm DevTools | Bấm F12 là vô hiệu, và làm trải nghiệm người dùng tệ hơn |
| Obfuscate/minify JS | Đọc lại được, chỉ gây khó cho lập trình viên |
| Ẩn field bằng `display:none` | **Dữ liệu vẫn nằm trong response.** Chỉ làm người khác dễ tìm thấy |
| Check `Referer` | Sửa 1 dòng là qua |
| Check `User-Agent` | Sửa 1 dòng là qua |
| Bắt login để xem mọi thứ | Làm SEO chết và người dùng chạy |

> Nguyên tắc: **bảo vệ dữ liệu ở tầng kiến trúc, không phải ở giao diện.** Ở tầng giao diện chỉ dùng để tăng độ khó cho kẻ cào ở mức *script tự động rẻ tiền*.

#### 4.7 Checklist bảo mật trước khi lên production

```
☐ service_role key KHÔNG nằm trong bất kỳ file nào trong repo
☐ anon key chỉ có quyền đọc, RLS chặn mọi bảng chứa PII
☐ listing_contacts: không có policy cho anon
☐ .env, .env.local nằm trong .gitignore
☐ CORS chỉ cho phép domain của bạn
☐ HTTPS bắt buộc, HSTS header
☐ X-Content-Type-Options: nosniff, X-Frame-Options
☐ Rate limit đã bật & ĐÃ THỬ
☐ Honeypot đã cài & đã test bằng script
☐ Turnstile đã bật trên form nhạy cảm
☐ Tài khoản test: admin, editor, agent, customer (4 role)
☐ Thử IDOR: đổi id tin trong /api/listings/:id → phải bị chặn
☐ Thử role thấp gọi endpoint admin → phải 403
☐ Kiểm tra: View Source của trang chủ có lộ số điện thoại nào không → KHÔNG được có
☐ Kiểm tra: localStorage/sessionStorage không chứa PII
☐ Kiểm tra: response Network không chứa PII ở request danh sách
```

---

## 8. HẠ TẦNG & TRIỂN KHAI

### 8.1 Cấu hình DNS

```
Domain bạn đã mua:  example.com

example.com            → CNAME  <user>.github.io
www.example.com        → CNAME  <user>.github.io

api.example.com        → Cloudflare Worker  (custom domain)
images.example.com     → Cloudflare R2 hoặc imgbb CDN
```

Trên Cloudflare: tạo Worker, gắn route `api.example.com/*`.

### 8.2 Pipeline CI/CD

```
git push main
      │
      ├──► GitHub Actions
      │      ├── npm ci
      │      ├── npm run test          (unit test + kiểm tra bảo mật)
      │      ├── npm run build         (Next.js → file tĩnh)
      │      └── deploy → nhánh gh-pages
      │
      └──► Kiểm tra trước khi deploy
             • secrets không bị commit (gitleaks)
             • không có service_role key trong bundle
             • build thành công
             • Lighthouse score ≥ 90
```

**Không deploy thẳng từ nhánh chính.** Quy trình: `develop → PR → review → staging → main`.

### 8.3 Môi trường

| Môi trường | Dùng cho | Dữ liệu |
|---|---|---|
| `local` | Dev máy bạn | Dữ liệu giả lập |
| `staging` | Test trước khi lên | Seed mẫu |
| `production` | Khách thật | Dữ liệu thật |

**Quy tắc:** môi trường production **không được** truy cập từ IP không whitelist. Access qua Cloudflare Access (Zero Trust) — miễn phí, 50 user.

### 8.4 Xử lý ảnh — nút thắt 1 GB

| Phương án | Chi phí | Đánh giá |
|---|---|---|
| Supabase Storage | 0đ | Đủ dùng giai đoạn đầu, đủ đến ~5.000 ảnh |
| **Cloudflare R2** | ~$0.005/GB | **Tốt nhất** — không tính egress, rẻ nhất dài hạn |
| imgbb miễn phí | 0đ | Nhanh, nhưng không kiểm soát được |
| Nén ngay trước khi upload | 0đ | **Bắt buộc làm** — dùng mọi phương án |

**Pipeline ảnh trong admin:**
1. User kéo thả ảnh gốc (JPG 5MB)
2. Client resize + nén: `sharp` hoặc `browser-image-compression` → WebP, max 1600px, ~200KB
3. Upload lên R2
4. Worker trả **signed URL** hết hạn 24h
5. Xoá ảnh gốc

→ 1 GB chứa được **~5.000 ảnh** WebP chất lượng tốt.

---

## 9. HAI PHƯƠNG ÁN TRIỂN KHAI

### Phương án A — Tiết kiệm, đơn giản

| Hạng mục | Lựa chọn | Miễn phí |
|---|---|---|
| Frontend | Next.js static export → **GitHub Pages** | ✓ |
| Backend | Supabase | ✓ |
| Gateway | Cloudflare Workers | ✓ |
| DNS | Domain của bạn | ✓ |

✅ Đúng ý bạn: source + frontend trên GitHub Pages
✅ Không cần thẻ tín dụng
❌ Chỉ SSG — **đăng tin mới phải rebuild và push** (chậm vài phút)
❌ Không có server-side rendering động
→ **Phù hợp nếu:** bạn thấy chấp nhận độ trễ 5 phút khi đăng tin.

### Phương án B — Đề xuất của mình ⭐

| Hạng mục | Lựa chọn | Miễn phí |
|---|---|---|
| Frontend | Next.js SSR trên **Vercel** | ✓ (100 GB/tháng) |
| Backend | Supabase | ✓ |
| Gateway | Cloudflare Workers | ✓ |
| Source | GitHub private repo (sync sang GitHub Pages) | ✓ |

✅ Đăng tin **hiện ngay** (ISR), không cần rebuild
✅ SEO tốt hơn (SSR theo từng quận/phường)
✅ Preview branch cho mỗi tính năng
✅ Vẫn có GitHub Pages làm nơi chứa source
❌ Cần thêm 1 tài khoản Vercel (miễn phí)

**Mình khuyên B.** Lý do: phân trang theo quận/phường là yếu tố số 1 của SEO BĐS, mà SSG rebuild toàn bộ cho 1 tin mới là rất bất tiện khi bạn cần cập nhật giá hằng ngày.

> Quyết định này phụ thuộc nhiều vào thói quen dùng hằng ngày của bạn. Bạn đăng tin bao nhiêu lần/ngày? Nếu dưới 10 tin thì A vẫn ổn.

---

## 10. LỘ TRÌNH TRIỂN KHAI

### Giai đoạn 0 — Nền móng (2–3 ngày)
```
☐ Tạo repo GitHub (private), cấu trúc thư mục
☐ Đăng ký Supabase, tạo project
☐ Đăng ký Cloudflare, tạo Worker, gắn domain
☐ Trỏ DNS về domain của bạn
☐ Bảng admin_districts: nhập 21 quận/huyện/thị xã (tên mới + tên cũ + aliases)
☐ Bảng admin_wards: nhập 168 phường/xã
☐ Viết file migration đầu tiên
```
**Đầu ra:** trang admin hiện được danh sách 21 quận + 168 phường.

### Giai đoạn 1 — Backend lõi (1 tuần)
```
☐ Schema: projects, listings, listing_contacts, profiles, contact_reveals, audit_logs
☐ Supabase Auth: đăng ký, đăng nhập, phân quyền
☐ Worker: xác thực JWT, rate limit, CORS
☐ API: CRUD listings (public read, owner write, admin write all)
☐ API: CRUD projects
☐ RLS: viết đầy đủ policy cho mọi bảng
☐ Test: IDOR, role escalation
```
**Đầu ra:** API hoạt động, dữ liệu an toàn ở tầng kiến trúc.

### Giai đoạn 2 — Admin (1–2 tuần)
```
☐ Khung admin: layout, menu, kiểm tra role
☐ Danh sách tin: bảng, lọc, sắp xếp, thao tác hàng loạn
☐ Form thêm/sửa tin (3 tab) + upload ảnh + chọn 21 quận → 168 phường
☐ Trang quản lý dự án
☐ Trang quản lý 168 phường & đường phố
☐ Dashboard: số tin, lượt xem, top dự án, tin chờ duyệt
```
**Đầu ra:** bạn tự thêm/sửa/xoá tin mà không cần ai.

### Giai đoạn 3 — Frontend khách (2–3 tuần)
```
☐ Trang chủ, trang danh sách, chi tiết tin
☐ Bộ lọc 21 quận / 168 phường / giá / loại / dự án
☐ Trang dự án chi tiết + bản đồ MapLibre
☐ 168 trang phường + 21 trang quận (SEO)
☐ Đăng ký / đăng nhập / tài khoản
☐ Xem SĐT có giới hạn lượt + Turnstile
☐ Responsive mobile
```
**Đầu ra:** khách dùng được trên điện thoại.

### Giai đoạn 4 — Bảo mật (1 tuần, làm song song)
```
☐ WAF rules: rate limit, chặn bot, chặn UA
☐ Turnstile lên mọi form
☐ Honeypot URL
☐ Canary record + cơ chế phát hiện rò rỉ
☐ Hệ thống cảnh báo bất thường
☐ robots.txt + điều khoản + chính sách bảo mật
☐ Signed URL cho ảnh
☐ Checklist 4.7 — chạy thử từng dòng
☐ Mời 1–2 người thử xâm nhập trong phạm vi
```
**Đầu ra:** có tài liệu bằng chứng đã bảo vệ.

### Giai đoạn 5 — Dữ liệu & vận hành (song song, 2–3 tháng)
```
☐ Nhập dự án: 500 toà nhà trước, dần mở rộng
☐ Nhập tin theo từng quận
☐ Viết bài SEO dài hạn
☐ Sitemap, Schema.org (RealEstateListing)
☐ Google Search Console + Analytics
☐ Sao lưu database hằng tuần (pg_dump tự động)
```

---

## 11. PHÂN BỔ CHI PHÍ KHI LỚN LÊN

| Mức | Chi phí | Khi nào nên nâng cấp |
|---|---|---|
| 0 đ | Free tier | Dưới 5.000 ảnh, dưới 50.000 req/ngày |
| ~$5/tháng | Supabase Pro | Vượt 500MB DB hoặc ảnh nhiều hơn |
| ~$5/tháng | Cloudflare R2 | Ảnh vượt 1 GB |
| ~$20/tháng | Vercel Pro | Traffic vượt 100 GB/tháng |
| Tự thuê VPS $5–10 | Không cần nếu trên đủ | Chỉ khi cần job nặng |

**Quy tắc:** chỉ nâng cấp khi **đo** được giới hạn đã chạm. Không nâng cấp phỏng đoán.

---

## 12. CÂU HỎI CẦN BẠN TRẢ LỜI

Để mình tinh chỉnh kế hoạch và bắt đầu code, cần bạn chốt 8 điểm này:

| # | Câu hỏi | Vì sao quan trọng |
|---|---|---|
| 1 | **GitHub Pages hay Vercel cho frontend?** | Quyết định SEO và tốc độ đăng tin (Phương án A hay B) |
| 2 | **Bạn đăng tin bao nhiêu lần/ngày?** | Nếu >10 tin/ngày thì bắt buộc chọn B |
| 3 | **Site cho thuê hay bán hay cả hai?** | Ảnh hưởng lớn đến schema & bộ lọc |
| 4 | **Bạn là chủ nhà/môi giới, hay cần quản lý cả môi giới khác?** | Quyết định có cần phân quyền agent + hoa hồng không |
| 5 | **Có tính phí xem SĐT không? Bao nhiêu?** | Đây là cơ chế kinh doanh chính + là lớp chống cào mạnh nhất |
| 6 | **Bạn có sẵn danh sách dự án không?** | Hay cần mình tìm + nhập giúp 500 toà nhà đầu tiên |
| 7 | **Có dùng tên gọi cũ (quận 9, quận 7) không?** | Cần bảng aliases để tìm kiếm khớp cả hai hệ thống |
| 8 | **Ngân sách khi cần trả phí: 0đ hay sẵn sàng ~$10/tháng?** | Quyết định có dùng Cloudflare R2 cho ảnh không |

---

## 13. MÌNH ĐỀ ĐÃ BIẾT TRƯỚC — NÊN THẲNG THẦN

**Hai điều bạn nên biết trước khi bắt đầu:**

**1. Xây xong không phải là hết công.** Phần khó nhất không phải code, mà là **nhập 500 dự án và duy trì giá cập nhật**. Đây là việc mất thời gian hằng ngày, không có cách nào tự động hoá toàn bộ mà không lo sai.

**2. Cạnh tranh với website đã có dữ liệu là rất khó.** Chỉ dựa vào giao diện đẹp thì không đủ. Yếu tố quyết định là **độ phủ dữ liệu** (bao nhiêu dự án, bao nhiêu tin) và **thứ hạng SEO**. Lợi thế của bạn: dữ liệu đúng theo hành chính mới 2025, bảo mật tốt hơn, và không có lịch sử nợ cũ.

Lời khuyên thực tế: **đừng làm toàn bộ ngay.** Làm cho đúng 3 quận (Thủ Đức, Bình Thạnh, Quận 1) thật tốt trước, để khách thử, rồi mở rộng. Một site có 300 tin chuẩn ở 3 quận thắng một site có 20.000 tin rác rưỡi.

---

*Tài liệu này là kế hoạch. Mình có thể bắt đầu code ngay khi bạn trả lời 8 câu ở Phần 12. Nếu bạn muốn mình chạy trước phần nào trong khi chờ, mình gợi ý: **Giai đoạn 0** — dựng cấu trúc repo, bảng 21 quận + 168 phường, và schema database. Phần đó chắc chắn cần làm và không phụ thuộc vào câu trả lời nào.*