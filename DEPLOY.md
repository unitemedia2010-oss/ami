# Đưa website lên GitHub Pages

Tài liệu này dành cho người **không phải lập trình viên** cần tự đổi trang
hoặc sửa lỗi khi deploy.

---

## 1. Repo đang dùng

```
https://github.com/unitemedia2010-oss/ami
```

Trang sau khi deploy:

```
https://unitemedia2010-oss.github.io/ami
```

---

## 2. Bật Pages (chỉ làm một lần)

Trên GitHub:

1. Vào repo **ami** → tab **Settings**
2. Menu bên trái → **Pages**
3. Ở mục **Build and deployment**:
   - **Source**: chọn **GitHub Actions**
4. Bấm **Save**

Không cần tạo `CNAME` — tên miền riêng làm sau (mục 6).

---

## 3. Đẩy code lên (lần đầu cần đăng nhập)

Máy này chưa có khoá GitHub. Làm **một lần** rồi các lần sau đẩy rất nhanh.

### Bước A — tạo Personal Access Token

1. Vào <https://github.com/settings/tokens>
2. Chọn **Generate new token (classic)**
3. Đặt tên `ami-deploy`, chọn thời hạn (ví dụ 90 ngày)
4. Tick ô **repo**
5. Bấm **Generate token**, copy token (chỉ hiện 1 lần)

### Bước B — đẩy code

Mở **PowerShell**, chạy đúng 3 dòng sau. Khi hỏi mật khẩu, **dán token vào**
(không phải mật khẩu GitHub — GitHub đã bỏ hỗ trợ mật khẩu cho push qua
HTTPS từ năm 2021).

```powershell
cd D:\Downloads\map3d
$env:PATH = "$env:LOCALAPPDATA\Programs\Git\cmd;$env:PATH"
git add -A; git commit -m "Cap nhat website"; git push -u origin main
```

> **An toàn:** token chỉ nằm trong terminal của bạn, không gửi vào đâu cả.
> Xoá token sau khi đẩy xong: Settings → Developer settings → Personal access
> tokens → **Delete**. Muốn đẩy lần sau thì tạo token mới.

### Các lần sau chỉ cần 2 dòng

```powershell
cd D:\Downloads\map3d
git add -A; git commit -m "Sua giao dien"; git push
```

GitHub tự build và xuất bản trong khoảng **2–4 phút**. Xem tiến độ ở tab
**Actions** trên repo.

---

## 4. Kịch bản GitHub Pages đang chạy ở chế độ nào

| | |
|---|---|
| Máy chủ | GitHub Pages (miễn phí) |
| Tiền tố đường dẫn | `/ami` — vì đây là *project site* |
| Nguồn dữ liệu | File JSON tĩnh trong `web/public/data/` |
| Máy chủ phía sau | **Chưa có** (chưa nối Supabase) |

**Điều này có nghĩa là gì khi trang đang chạy trên Internet:**

- Danh sách tin, dự án, bản đồ: **có đầy đủ** (788 tin, 193 dự án)
- **Xem số điện thoại môi giới**: chưa dùng được (báo rõ là bản xem thử)
- **Đăng tin / đăng nhập / trang quản trị**: chưa dùng được
- Bản đồ vẽ đúng, nhưng **toạ độ là tâm quận**, không phải vị trí thật của
  dự án (giao diện có ghi chú ngay dưới bản đồ)

Đây là chủ ý: muốn xem giao diện trước khi bỏ tiền cho hạ tầng.

---

## 5. Khi nào nối Supabase (chuyển sang máy chủ thật)

Trong repo, vào **Settings → Secrets and variables → Actions → Variables**, tạo:

| Tên | Ví dụ | Bắt buộc |
|---|---|---|
| `API_URL` | `https://ami-api.….workers.dev` | khi có Worker |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | khi có Supabase |
| `SUPABASE_ANON_KEY` | `eyJhbGci…` | khi có Supabase |
| `TURNSTILE_SITE_KEY` | `0x4AAAA…` | khi mở xem SĐT |

Lưu ý: `SUPABASE_ANON_KEY` là khoá công khai (ai cũng đọc được trong mã
nguồn trình duyệt) — đó là bình thường. **Không bao giờ** đặt
`SUPABASE_SERVICE_ROLE_KEY` hay mật khẩu admin vào đây.

Sau khi có Worker, đẩy code lần nữa. Không cần sửa dòng nào trong giao diện —
`web/src/lib/api.ts` tự chuyển sang gọi API thật khi thấy `API_URL` khác rỗng.

---

## 6. Gắn tên miền riêng (làm sau, khi đã mua xong)

1. Trong DNS của nhà cung cấp tên miền, thêm bản ghi **CNAME**:

   ```
   tenmien-cua-ban.com   CNAME   unitemedia2010-oss.github.io
   ```

2. Repo → **Settings → Pages → Custom domain**: điền tên miền, bấm Save.
3. Tick **Enforce HTTPS** sau khi chứng chỉ cấp xong (mất vài phút đến 24 giờ).

> ⚠ **Quan trọng:** khi gắn xong, trang phục vụ ở **gốc tên miền**
> (`https://tenmien-cua-ban.com/`), không còn thư mục `/ami` nữa.
> Phải sửa `.github/workflows/deploy.yml`:
>
> ```yaml
> NEXT_PUBLIC_BASE_PATH: /ami      →      NEXT_PUBLIC_BASE_PATH: ''
> ```
>
> rồi đẩy code lại. Nếu quên, mọi ảnh và file JS sẽ trả 404.

---

## 7. File quan trọng — đừng xoá nhầm

| Đường dẫn | Vai trò |
|---|---|
| `web/public/data/*.json` | **Dữ liệu của trang.** Xoá là trang trắng |
| `web/src/lib/api.ts` | Điểm duy nhất chuyển giữa "dữ liệu tĩnh" và "API thật" |
| `web/src/lib/staticData.ts` | Đọc và lọc file JSON khi không có máy chủ |
| `web/src/lib/cover.ts` | Vẽ ảnh minh hoạ bằng SVG (không tải ảnh nào) |
| `web/src/data/districts.ts` | Danh sách quận dùng lúc build 25 trang `/quan/[slug]` |
| `web/next.config.mjs` | Không khai báo khối `env` ở đây — xem ghi chú trong file |
| `tools/export_static.mjs` | Sinh lại `web/public/data/*.json` từ dữ liệu gốc |

Nếu đổi dữ liệu gốc, chạy lại:

```powershell
cd D:\Downloads\map3d
node tools\check_dataset.mjs      # kiểm tra dữ liệu trước
node tools\export_static.mjs      # xuất JSON tĩnh
```

---

## 8. Xử lý sự cố

**Deploy lỗi "process out of memory"**
Thêm vào bước Build trong `deploy.yml`:
```yaml
NODE_OPTIONS: --max-old-space-size=4096
```

**Trang mở ra trắng, không có ảnh**
Sai tiền tố đường dẫn. Xem mục 6. Kiểm tra nhanh: mở
<https://unitemedia2010-oss.github.io/ami/>, bấm F12 → tab Console.

**Deploy xong vẫn thấy dữ liệu cũ**
Trình duyệt cache. Nhấn `Ctrl + F5` (xoá cache), hoặc chờ ~10 phút.

**Job không chạy**
Tab **Actions** → xem job đỏ. Thường do chưa bật Pages theo mục 2.

**Chạy lại deploy**
Tab **Actions** → chọn workflow → **Run workflow**.