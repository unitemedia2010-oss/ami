# Worker API — hướng dẫn cài đặt

---

## 1. Tạo tài nguyên trên Cloudflare

```bash
npm install -g wrangler
wrangler login

cd workers/api

# KV cho rate limit
wrangler kv:namespace create RATE_LIMIT
# → copy id vào wrangler.toml, thay THAY_BẰNG_KV_NAMESPACE_ID

# R2 cho ảnh
wrangler r2 bucket create bds-images
```

## 2. Lấy secrets từ Supabase

Vào Supabase Dashboard → **Project Settings → API**:

| Secret | Ở đâu | Ghi chú |
|---|---|---|
| `SB_URL` | Project URL | `https://xxxx.supabase.co` |
| `SB_ANON_KEY` | anon public key | An toàn khi nằm trong trình duyệt |
| `SB_SERVICE_KEY` | service_role key | ⚠ **BÍ MẬT** — không bao giờ commit |
| `SB_JWT_SECRET` | JWT Secret | Dùng verify token người dùng |

## 3. Tạo Turnstile

1. Cloudflare Dashboard → **Turnstile → Add site**
2. Domain: `bds.example.com` + `staging.bds.example.com`
3. Widget mode: **Managed** (không hiện challenge với người thật)
4. Copy **Secret key** → `TURNSTILE_SECRET`

## 4. Nạp secrets

```bash
wrangler secret put SB_URL
wrangler secret put SB_ANON_KEY
wrangler secret put SB_SERVICE_KEY      # dán service_role key
wrangler secret put SB_JWT_SECRET
wrangler secret put TURNSTILE_SECRET
wrangler secret put FP_SECRET          # openssl rand -hex 32
wrangler secret put R2_KEY_ID
wrangler secret put R2_SECRET
```

## 5. Deploy

```bash
wrangler deploy
wrangler tail          # xem log trực tiếp
```

## 6. Gắn domain

Cloudflare Dashboard → **Workers & Pages** → `bds-api` → **Settings → Triggers**
→ Custom domain: `api.bds.example.com`

---

## Endpoint sau khi deploy

| Method | Đường dẫn | Cần đăng nhập | Turnstile | Ghi chú |
|---|---|:--:|:--:|---|
| GET | `/api/listings` | – | – | Trang 1–100, 24/trang |
| GET | `/api/search-units?q=` | – | – | Hỗ trợ tìm bằng tên quận cũ |
| GET | `/api/listings/:slug` | – | – | **Không trả `address_line`** |
| GET | `/api/projects?q=` | – | – | Tối đa 60 dự án |
| GET | `/api/admin-units` | – | – | 21 quận + 168 phường, cache 24h |
| POST | `/api/contact/reveal` | ✅ | ✅ | Xem số điện thoại |
| GET | `/img/*` | – | – | Signed URL ảnh, hết hạn 1 giờ |
| * | `/api/admin/*` | ✅ | – | Phân quyền do RLS xử lý |

---

## Kiểm thử bảo mật sau khi deploy

```bash
API=https://api.bds.example.com

# 1. Danh sách tin — phải trả dữ liệu
curl "$API/api/listings?per_page=2"

# 2. Phải KHÔNG có address_line trong kết quả
curl "$API/api/listings?per_page=2" | grep -i address_line   # → rỗng

# 3. Không token → 401
curl -X POST "$API/api/contact/reveal" \
  -H 'Content-Type: application/json' \
  -d '{"listingId":"..."}'                                    # → 401

# 4. Có token nhưng thiếu Turnstile → 403
curl -X POST "$API/api/contact/reveal" \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"listingId":"..."}'                                    # → 403

# 5. Honeypot — bot bị chặn
curl "$API/listing/all-export"                                # → 404 + ghi cảnh báo

# 6. Rate limit — gọi 300 lần liên tiếp
for i in $(seq 1 300); do curl -s "$API/api/listings" > /dev/null; done
# → phải bắt đầu trả 429

# 7. Thử gọi thẳng PostgREST (lối tắt của kẻ cào)
#    Kỳ vọng: "permission denied for column address_line"
```

---

## Xem cảnh báo trong admin

Mọi dấu hiệu bất thường được ghi vào bảng `access_alerts`:

```sql
SELECT created_at, alert_type, severity, detail
FROM access_alerts ORDER BY created_at DESC LIMIT 50;
```

Khi thấy `honeypot_hit` hoặc `bot_detected` lặp lại từ cùng fingerprint → có kẻ đang cào. Dùng hash đó để chặn:

```sql
INSERT INTO blocked_fingerprints (fingerprint, reason, blocked_until)
SELECT detail->>'ua', 'bot_detected', now() + interval '7 days'
FROM access_alerts WHERE severity = 'high' LIMIT 1;
```

---

## Ghi chú về `r2Sign`

Hàm ký ảnh trong `src/index.js` đang dùng cách đơn giản hóa. Nếu bạn cần URL ảnh có chữ ký chuẩn SigV4, thay bằng:

```bash
npm install @cloudflare/workers-types
```

hoặc dùng package `aws4fetch`. Xem: <https://developers.cloudflare.com/r2/api/s3/presigned-urls/>

Nếu chưa cần, cách hiện tại vẫn giữ được điểm chính: **URL ảnh có thời hạn, không lộ tên bucket gốc**.