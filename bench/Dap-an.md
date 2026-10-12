# ĐÁP ÁN CHUẨN + CÁCH CHẤM

## Lỗi 1 — dropdown mất chữ

**Nguyên nhân**: `text-white` trên `<select>` được KẾ THỪA (inherit) xuống
`<option>`. Khi mở dropdown, trình duyệt vẽ nền danh sách theo hệ điều hành
(mặc định trắng) nhưng màu chữ kế thừa từ select vẫn là trắng.

**Sửa**: ép riêng cho option, không dựa vào màu của select:
```css
select { color: white }
select > option { background: white; color: coal-900; }
```

**Điểm cần nhắm**: nói "kế thừa màu" là đúng; chỉ nói "nền tối" hoặc "đổi
màu select" là chưa đạt. Nhận ra `text-white` **không** phải lỗi ở thẻ đóng.

## Lỗi 2 — bản đồ trống

**Nguyên nhân**: bộ lọc mặc định `approximate === true` → false, giấy 301/402
marker, trong đó có trọn Thủ Đức (81) và Quận 7 (40).

**Kết luận đúng**: dữ liệu TOẠ ĐỘ kém chứ không phải bộ lọc sai. Bật
`approximate` lên sẽ làm mọi chấm dồn vào tâm quận — tệ hơn.

**Cách sửa duy nhất đúng**: định vị thật. Kết quả phiên này: 101 → 261/441.

**Điểm cần nhắm**: nếu model trả lời "tắt bộ lọc mặc định" thì **sai** —
đó là cái bẫy câu hỏi đang kiểm.

## Lỗi 3 — chết trên Linux

**Nguyên nhân**: `process.cwd() + '\\'` chỉ có trong đường dẫn Windows. Linux
dùng `/` nên replace không khớp → `rel` giữ đường dẫn tuyệt đối →
`join(SRC, rel)` nhân đôi.

**Sửa**: `relative(SRC, file)`.

**Câu 3 (mở rộng)**: các ví dụ đúng —
- tách đường dẫn bằng `'/'` → sai trên Windows
- `path.sep` hardcode
- so sánh chuỗi đường dẫn bằng `startsWith` có thể khớp nhầm với tiền tố
  (`/a/bc` khớp tiền tố `/a/b`)
- `join()` với đường dẫn đã tuyệt đối — `path.join` không "giữ nguyên" đường
  dẫn tuyệt đối như một số ngôn ngữ khác

Cách đúng: `path.relative`, `path.resolve`, `path.parse().root`, hoặc `URL`.

## Lỗi 4 — lọc theo dự án

Ba tầng:
- **(a)** `Filters` thiếu `project` → dòng khởi tạo state không đọc
  `sp.get('project')`. **Tầng quyết định.**
- **(b)** URL mang MÃ (`prj-x40`) còn dữ liệu lưu TÊN (`project_name`)
  → `includes("prj-x40")` không khớp gì
- **(c)** Không khớp → điều kiện lọc không loại gì → hiện toàn bộ 27.659 tin

**Câu hỏi then chốt**: tầng nào khiến người dùng **nhìn thấy toàn bộ**?
→ (a). Vì không có nó thì bộ lọc chưa từng chạy.

## Câu tự đánh giá

| Câu | Đáp án tốt |
|---|---|
| 1 | Lỗi 1 và 4 nhận ra ngay từ đọc mã. Lỗi 3 cần biết Linux dùng `/`. Lỗi 2 cần đọc số liệu. |
| 2 | Lỗi 4 kiểm chứng bằng cách đếm `project_name` có tồn tại không, hoặc chạy bộ lọc với `prj-x40` và in ra số dòng. Lỗi 3 kiểm chứng bằng `path.win32.join` / `path.posix.join` hoặc `path.parse()` trên chuỗi POSIX. |
| 3 | Xem mục "Câu 3" ở trên. |

## Thang điểm (mỗi lỗi 2 điểm, tổng 8)

- **2 điểm**: nêu đúng nguyên nhân gốc VÀ đúng cách sửa
- **1 điểm**: nêu đúng nguyên nhân nhưng cách sửa sai/thiếu
- **0 điểm**: sai nguyên nhân, hoặc đúng nguyên nhân nhưng nói sai hậu quả

**Lỗi 2 nhớ dấm đỏ**: trả lời "tắt bộ lọc mặc định" → 0 điểm.
**Lỗi 4 nhớ dấm đỏ**: chỉ tìm ra (b) → tối đa 1 điểm, vì (b) ẩn sau (a).