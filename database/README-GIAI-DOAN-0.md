# GIAI ĐOẠN 0 — Hướng dẫn cài đặt

> Đã xong: schema database + RLS + seed hành chính.
> Bước tiếp theo: Cloudflare Worker + giao diện.

---

## ⚠ ĐỌC TRƯỚC: VỀ DANH SÁCH 21 QUẬN / 168 PHƯỜNG

Mình đã ghi **25 dòng** (nhiều hơn 21) và đánh dấu `verified = false` cho tất cả.

**Lý do:** con số 21 đơn vị cấp huyện là chính thức, nhưng **tên gọi cụ thể từng đơn vị** phải đối chiếu Nghị quyết 1685/NQ-UBTVQH15 và Quyết định của UBND TP.HCM. Mình không có nguồn tra cứu trực tiếp lúc viết, nên:

> **Đừng chạy vào production cho tới khi đã đối chiếu.**
> Sai một tên phường = hỏng URL SEO `/phuong/[slug]` đó vĩnh viễn.

### Cách đối chiếu (khoảng 10 phút)

| Bước | Việc |
|---|---|
| 1 | Tải **Nghị quyết 1685/NQ-UBTVQH15** (16/06/2025) từ `congbao.chinhphu.vn` hoặc `thuvienphapluat.vn` |
| 2 | Mở `003_seed_admin_units.sql`, sửa tên cho khớp |
| 3 | Chạy: `UPDATE admin_districts SET verified = true;` |
| 4 | Bảng 168 phường/xã: lấy từ **Phụ lục** của cùng Nghị quyết, nhập qua `/admin/wards` (trang này mình sẽ xây ở bước sau) |

**Mẫu CSV 168 phường** có sẵn trong file SQL. Chỉ cần điền và import.

---

## 1. Tạo project Supabase

1. Vào <https://supabase.com> → **New project**
2. Đặt tên: `bds-tphcm`
3. Chọn region **Singapore** (gần Việt Nam nhất, độ trễ thấp)
4. Lưu lại: project URL, `anon key`, `service_role key`

> 🔒 **`service_role key` là bí mật tuyệt đối.** Chỉ đặt trong biến môi trường của
> Cloudflare Worker. **Không bao giờ** commit vào Git, không nhúng vào trình duyệt.

---

## 2. Chạy 3 file SQL theo thứ tự

Trong Supabase Dashboard → **SQL Editor** → dán từng file → **Run**

| Thứ tự | File | Nội dung |
|---|---|---|
| 1️⃣ | `database/001_schema.sql` | 17 bảng, index, enum, trigger tự sinh slug |
| 2️⃣ | `database/002_security.sql` | RLS + `reveal_contact()` + `api_create_listing()` |
| 3️⃣ | `database/003_seed_admin_units.sql` | 25 dòng đơn vị cấp huyện (tạm) |
| 4️⃣ | `database/004_column_grants.sql` | ** vá lỗ hổng** cột PII + view an toàn + hàm API |

**Kiểm tra thành công:**

```sql
-- Kỳ vọng: 17
SELECT count(*) FROM information_schema.tables
 WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Kỳ vọng: tất cả đều 't' (RLS đã bật)
SELECT relname, relrowsecurity FROM pg_class
 WHERE relname IN ('listing_contacts','listings','profiles','projects');

-- Kỳ vọng: true — nếu false, view đang BỎ QUA RLS, phải sửa lại
SELECT reloptions FROM pg_class WHERE relname = 'listing_cards';
```

### Test bảo mật ngay (quan trọng nhất)

```sql
-- Chạy với vai trò anon (không đăng nhập):
SET ROLE anon;

SELECT * FROM listing_contacts LIMIT 1;
-- KẾT QUẢ ĐÚNG: ERROR: permission denied for table listing_contacts

SELECT id, title, price FROM listings WHERE status = 'published' LIMIT 1;
-- KẾT QUẢ ĐÚNG: trả về dữ liệu (đây là dữ liệu công khai)

RESET ROLE;
```

> `listing_contacts` phải **từ chối** với anon.
> Nếu nó trả về dữ liệu → dừng lại, báo mình ngay.

---

## 3. Kiểm tra hàm xem SĐT

```sql
-- Phải báo lỗi "Yêu cầu đăng nhập"
SELECT * FROM reveal_contact(
  (SELECT id FROM listings LIMIT 1), 'test', 'test-agent'
);
```

---

## 3b. Test tìm theo tên quận cũ (quan trọng)

Sau khi nạp ít nhất vài tin, kiểm tra `api_listings` chấp nhận tên cũ:

```sql
-- Gõ "quận 9" → phải ra các tin thuộc Thành phố Thủ Đức
SELECT data->0->>'title' AS ten_tin, total
FROM api_listings(p_keyword => 'quan 9');

-- So sánh: gõ "thủ đức" → cùng nhóm kết quả
SELECT data->0->>'title' AS ten_tin, total
FROM api_listings(p_keyword => 'thu duc');

-- Kiểm tra đơn vị hành chính được nhận diện
SELECT kind, name FROM api_search_units('quan 9');
```

Nếu `total` bằng 0 → kiểm tra cột `aliases` trong `admin_districts` đã nhập chưa.

---

## 3c. ⚠ Cạm bẫy thường gặp — view làm mất RLS

Postgres mặc định cho **view** quyền của chủ sở hữu view, tức là **bỏ qua RLS** của bảng gốc.

Hệ quả: tạo một view trên bảng đang có RLS rồi đọc qua view → né được toàn bộ chính sách.

Đã xử lý bằng `security_invoker = true` trong `listing_cards`. **Khi bạn tạo thêm view, nhớ làm y hệt** — nếu không sẽ tạo lỗ hổng mà không ai nhận ra.

Kiểm tra:

```sql
-- Phải trả về {security_invoker=true}
SELECT reloptions FROM pg_class WHERE relname = 'listing_cards';
```

Chính sách hiện tại đã theo quyết định của bạn:

```json
{ "price_mode": "free", "daily_limit_enabled": false }
```

**Muốn bật giới hạn lượt/ngày sau này** — không cần sửa code, chạy 2 dòng:

```sql
UPDATE site_settings SET value =
  jsonb_set(value, '{daily_limit_enabled}', 'true'::jsonb)
WHERE key = 'contact';

UPDATE profiles SET daily_reveal_limit = 10;
```

---

## 4. Cấu trúc thư mục hiện tại

```
D:\Downloads\map3d\
├── database\
│   ├── 001_schema.sql            ✅ 16 bảng
│   ├── 002_security.sql          ✅ RLS + reveal_contact()
│   ├── 003_seed_admin_units.sql  ✅ 25 dòng — CẦN ĐỐI CHIẾU
│   ├── 004_import_wards.csv      ⏳ mẫu, chờ điền dữ liệu 168 phường
│   └── README-GIAI-DOAN-0.md     ✅ file này
│
├── KE-HOACH-WEBSITE-BDS.md       ✅ kế hoạch đầy đủ 13 phần
├── DIEU-CHINH-KE-HOACH.md        ✅ điều chỉnh theo 8 câu trả lời của bạn
│
└── (các file demo cũ: index.html, map-tienich.html, scrape.js…)
```

---

## 5. Còn lại — cần bạn làm

| Việc | Ở đâu |
|---|---|
| ⬜ Tạo project Supabase | [supabase.com](https://supabase.com) |
| ⬜ Chạy 3 file SQL | Supabase → SQL Editor |
| ⬜ **Đối chiếu tên 21 quận + nhập 168 phường** | Nghị quyết 1685 |
| ⬜ Cấu hình DNS trên domain | Cloudflare |

## 6. Mình làm tiếp được ngay (không cần chờ bạn)

- **Cloudflare Worker** — API Gateway, rate limit, Turnstile, signed URL ảnh R2
- **Khung Next.js static export** — trang chủ + trang danh sách
- **Trang admin `/admin`** — CRUD tin, dự án, phường, users, cảnh báo
- **Script nén + upload ảnh tự động lên R2**

Bạn muốn mình làm tiếp phần nào trước?