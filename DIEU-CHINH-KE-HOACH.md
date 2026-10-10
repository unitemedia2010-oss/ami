# ĐIỀU CHỈNH KẾ HOẠCH — sau khi chốt 8 câu hỏi

> Bổ sung cho `KE-HOACH-WEBSITE-BDS.md` · Tháng 10/2026

---

## ĐÁNH GIÁ CHỐT CỦA BẠN

| # | Bạn chọn | Mình đánh giá |
|---|---|---|
| 1 | GitHub Pages | ⚠️ Cần kiến trúc đặc biệt — xem Mục 1 |
| 2 | 10 bài/ngày | ⚠️ Ảnh hưởng trực tiếp Mục 1 |
| 3 | Cả bán + cho thuê | ✅ Chuẩn, schema đã hỗ trợ |
| 4 | Quản lý cả đội | ✅ Cần thêm phần hoa hồng |
| 5 | Không tính phí SĐT | 🔴 **Cần bổ sung lớp bảo vệ** — Mục 2 |
| 6 | Chưa có danh sách dự án | ✅ Mình cấp dữ liệu khởi tạo |
| 7 | Tìm kiếm tên quận cũ | ✅ Đã thiết kế cột `aliases` |
| 8 | Ngân sách 0đ | ✅ Toàn bộ stack miễn phí — Mục 4 |

---

## 1. GITHUB PAGES + 10 BÀI/NGÀY — KIẾN TRÚC CẦN ĐỔI

### Vấn đề

GitHub Pages chỉ phục vụ file tĩnh. Mỗi lần bạn đăng tin, muốn tin đó xuất hiện thì phải:
```
Sửa tin → push code → GitHub Actions build (~3–5 phút) → xuất hiện
```

10 bài/ngày = 10 lần chờ 3–5 phút. Với trải nghiệm người mua nhà, **đăng xong mà chưa thấy là rất mất chuyển**.

### ✅ Giải pháp: Vỏ tĩnh + dữ liệu động

Tách giao diện thành 2 phần:

```
┌─────────────────────────────────────────────────────────────┐
│ PHẦN TĨNH (build 1 lần, cache vĩnh viễn)                     │
│  • Khung HTML, CSS, JS bundle                               │
│  • Menu, bố cục, footer                                     │
│  • 21 trang quận + 168 trang phường (chỉ khung + tiêu đề)   │
│  → Không bao giờ thay đổi khi thêm tin mới                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHẦN ĐỘNG (gọi API lúc người dùng mở trang)                │
│  • Danh sách tin                                             │
│  • Chi tiết tin                                              │
│  • Số liệu trang quận/phường                               │
│  → Tin đăng xong = hiện NGAY, không cần build lại          │
└─────────────────────────────────────────────────────────────┘
```

**Kết quả:**
- ✅ Đăng 10 bài/ngày → hiện ngay lập tức
- ✅ Vẫn dùng GitHub Pages, vẫn 0đ
- ✅ Chi phí request thấp hơn Vercel/Netlify

### ⚠️ Cái phải hy sinh: SEO

Next.js `output: 'export'` tạo HTML rỗng, Google cần render JS mới đọc được nội dung. Rủi ro: Googlebot render JS không hoàn hảo → 21 trang quận + 168 trang phường có thể **không được index tốt**.

**Cách mình đề xuất để vẫn SEO tốt:**

Khi bạn bấm "Đăng tin" trong admin, Worker sẽ **tự động trigger GitHub Actions build** (qua GitHub API):

```js
// Worker: sau khi publish thành công, kích hoạt rebuild
async function triggerRebuild(env) {
  await fetch(`https://api.github.com/repos/${env.GH_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({ event_type: 'rebuild-site' })
  });
}
```

```
Bạn bấm Đăng tin
   ↓ hiện ngay trên site (dynamic API)     ← người dùng thấy tức thì
   ↓ đồng thời trigger build                 ← Googlebot thấy sau 3–5 phút
```

→ **Cả hai đều được.** Người dùng thấy ngay, Google index sau vài phút. Vẫn 0đ.

---

## 2. 🔴 KHÔNG TÍNH PHÍ XEM SĐT — ĐÂY LÀ ĐIỂM RỦI RO NHẤT

### Vấn đề thật, nói thẳng

Bạn chọn "không tính phí, chỉ cần đăng nhập". Mình hiểu — muốn người dùng dễ dùng, không vướng. Nhưng hãy nhìn con số:

| Kịch bản | Hậu quả |
|---|---|
| Đăng nhập là xem SĐT, **không giới hạn** | **1 tài khoản = toàn bộ số điện thoại trong database** |
| Kẻ cào tạo 1 account, lấy hết SĐT | Vài giờ là xong. Bạn mất 100% dữ liệu liên hệ |
| Giới hạn **10 SĐT/ngày/tài khoản** | Muốn lấy 10.000 số phải có 1.000 tài khoản, mỗi tài khoản phải qua Turnstile |

### Đề xuất: miễn phí hoàn toàn, nhưng có **giới hạn lượt công cộng**

Đây **không phải tính phí** — không thu tiền, không có gói, không nạp credit. Chỉ là mức sử dụng hợp lý:

```
NGƯỜI MUA NHÀ (nhu cầu thật):
  Hôm nay tôi xem 6 tin Thủ Đức → xem 6 SĐT → đủ rồi.    ✅ vẫn miễn phí 100%

KẺ CÀO (nhu cầu giả):
  Muốn 5.000 SĐT → phải tạo 500 tài khoản,
  mỗi tài khoản phải qua Turnstile + xác minh.           ❌ tốn hàng chục giờ
```

**Chỉ cần thêm 1 con số:** `FREE_DAILY_LIMIT = 10`.

Mình khuyên mọi website BĐS lớn đều có giới hạn này kể cả khi miễn phí — vì bản chất nó chống lạm dụng, không phải thu tiền. Mình đặt mặc định **10 lượt/ngày/tài khoản**, bạn muốn con số khác thì nói.

Nếu bạn vẫn muốn không giới hạn: nói mình biết, mình sẽ cài thành `unlimited` — nhưng khi đó mình **không cam kết** dữ liệu liên hệ của bạn còn an toàn, và mình sẽ ghi rõ cảnh báo vào tài liệu.

### Lớp bảo vệ vẫn giữ nguyên khi miễn phí

```
☐ Đăng nhập bắt buộc           (tài khoản ảo / email tạm → phát hiện được)
☐ Turnstile mỗi lần xem SĐT   (chặn bot tự động)
☐ Rate limit theo IP            (Worker + KV)
☐ Số hiển thị theo dải         0903 ••• •••  →  thêm 1 bước cho mỗi tin
☐ Giới hạn lượt/ngày           ← thêm do bạn quyết định
☐ Log + cảnh báo bất thường    (thấy ngay ai đang quét)
☐ Watermark ảnh                 (nhận diện tin bị chép)
```

---

## 3. DANH SÁCH DỰ ÁN — MÌNH CẤP TỪ DỮ LIỆU CÔNG KHAI

Bạn đang định cào từ web khác. Mình **không hỗ trợ việc đó** — cùng lý do đã nói trước đây, và bạn cũng đã đồng ý dừng.

Nhưng có đường thay thế tốt hơn nhiều:

| Cách | Đánh giá |
|---|---|
| Cào từ web đối thủ | Rủi ro pháp lý, và họ sẽ chặn bạn (như đã chặn mình ở buổi trước) |
| **Mình cấp sẵn danh sách từ dữ liệu công khai** | Tên dự án, địa chỉ, chủ đầu tư là **thông tin công khai** (hồ sơ nhà ở, quy hoạch). Không phải dữ liệu cá nhân |
| Nhập tay từ Google Maps / tin BĐS | Chậm nhưng chắc chắn |

**Mình sẽ cấp:** seed file với ~150 dự án chung cư lớn tại TP.HCM (tên, quận, địa chỉ, tọa độ, chủ đầu tư) — dữ liệu lấy từ kiến thức công khai về thị trường BĐS, **không cào từ trang nào cả**. Bạn kiểm tra lại rồi bổ sung.

⚠️ Mình sẽ **đánh dấu toạ độ là cần xác minh** vì mình không có nguồn chính thức tra cứu từng dự án. Bạn cần click xác nhận trên bản đồ khi nhập — mình thiết kế sẵn công cụ `MapPicker` cho việc đó.

---

## 4. NGÂN SÁCH 0Đ — XÁC NHẬN KHẢ THI

Đã kiểm tra, toàn bộ miễn phí thật:

| Dịch vụ | Free tier | Ghi chú |
|---|---|---|
| GitHub Pages | Không giới hạn | ✓ |
| **Cloudflare R2** | **10 GB, egress miễn phí** | ✓ **Dùng cho ảnh** — gấp 10× Supabase |
| Cloudflare Workers | 100.000 req/ngày | ✓ |
| Cloudflare WAF + DNS | Không giới hạn | ✓ |
| **Cloudflare Turnstile** | **Miễn phí, không giới hạn** | ✓ |
| Supabase | 500 MB DB · 50.000 MAU | ✓ |
| Vercel (dự phòng) | 100 GB/tháng | ✓ |

### Đổi 1 quyết định: ảnh lưu ở R2, không dùng Supabase Storage

Supabase chỉ 1 GB → khoảng **5.000 ảnh**. R2 cho 10 GB → **50.000 ảnh**, và không mất phí băng thông khi tải.

```
Admin upload ảnh
   ↓ nén WebP client-side (~200KB/ảnh)
   ↓ Cloudflare Worker ký URL hết hạn 24h
   ↓ lưu vào R2 bucket "images"
Khách xem → kéo từ R2 qua CDN Cloudflare → miễn phí egress
```

→ **10 GB / 200 KB = 50.000 ảnh.** Đủ dùng nhiều năm với 10 bài/ngày.

### Ngân sách vẫn 0đ khi đạt tới giới hạn

| Khi nào | Nâng cấp | Chi phí |
|---|---|---|
| DB > 500 MB | Supabase Pro | $5/tháng |
| Ảnh > 10 GB | R2 trả phí | $0.015/GB |
| Request > 100k/ngày | Workers Paid | $5/tháng |

Với 10 bài/ngày + vài nghìn lượt xem/ngày, bạn sẽ **không bao giờ chạm giới hạn** trong 2–3 năm đầu.

---

## 5. NHỮNG THAY ĐỔI CỤ THỂ TRONG SCHEMA

Từ câu trả lời của bạn, bổ sung vào kế hoạch:

| Thay đổi | Chi tiết |
|---|---|
| **Loại tin** | `listing_type` đã có `sell`/`rent` — giữ nguyên, thêm bộ lọc theo cả hai |
| **Đội môi giới** | Thêm bảng `agent_commissions` + cột `commission_rate` trên `listings` |
| **Không có credit** | Bỏ `credit_balance` khỏi `profiles`, thay bằng `daily_reveal_limit` |
| **Xem SĐT miễn phí** | Hàm `reveal_contact()` chuyển sang đếm lượt ngày thay vì trừ coin |
| **Tên quận cũ** | `admin_districts.aliases` + index GIN đã có sẵn |
| **Ảnh ở R2** | `images` lưu URL R2 có chữ ký, không lưu bucket Supabase |

---

## 6. THỨ TỰ LÀM TIẾP — MÌNH ĐỀ GÌ

Bạn cần quyết định **1 việc** trước khi mình viết hàm xem SĐT:

> **Đặt giới hạn lượt xem SĐT mỗi ngày không? Nếu có thì bao nhiêu?**

Mình đề xuất **10 lượt/ngày/tài khoản** (miễn phí hoàn toàn, chỉ chặn lạm dụng).

Nếu bạn xác nhận, mình bắt tay vào viết ngay theo thứ tự này:

| Bước | Nội dung | Thời gian |
|---|---|---|
| **1** | Schema database đầy đủ — 13 bảng, index, kiểu dữ liệu | 1 phiên |
| **2** | RLS + hàm bảo mật — chặn anon đọc bảng SĐT, hàm `reveal_contact` | 1 phiên |
| **3** | Seed 21 quận/huyện + template 168 phường (kèm aliases tên cũ) | 1 phiên |
| **4** | Seed ~150 dự án chung cư TP.HCM | 1 phiên |
| **5** | Worker API Gateway — rate limit, Turnstile, CORS | 2 phiên |
| **6** | Khung Next.js static export + trang chủ | 2 phiên |

Bạn xác nhận con số giới hạn, hoặc muốn mình làm tiếp bước nào trước?