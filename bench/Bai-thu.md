# Bài thử năng lực code — 4 lỗi từ dự án SGREALTY

Các lỗi dưới đây **đã xảy ra thật** trong dự án này. Chúng được chọn vì
đều có tính chất: build vẫn xanh, không có báo lỗi nào, nhưng hậu quả thì
thấy được bằng mắt hoặc bằng hành vi thật.

Không cần sửa. Chỉ cần **nhận ra** và **giải thích đúng nguyên nhân**.

---

## Lỗi 1 — Dropdown không đọc được chữ

Một thẻ `<select>` nằm trên header màu tối:

```jsx
<select className="h-10 px-3 text-[13px] font-semibold
                   bg-white/[0.12] border-y border-white/20 text-white">
  <option value="">Tất cả khu vực</option>
  <option value="1">Quận 1</option>
  <option value="8">Quận 8</option>
</select>
```

Khi bấm mở, **danh sách khu vực hiện ra nền trắng nhưng chữ trắng** —
không đọc được chữ nào. Ô đóng lại thì vẫn bình thường.

Hỏi: nguyên nhân gì? Sửa bằng cách nào?

---

## Lỗi 2 — Bản đồ trắng ở khu vực quan trọng

Trang bản đồ có 402 marker. Mặc định bật lọc "chỉ hiện vị trí đã định vị
thật", tức là **bỏ qua mọi marker có cờ `approximate === true`**.

Dữ liệu thật: **301/402 marker có `approximate: true`** (đặt tạm ở tâm quận),
và 81 trong số đó thuộc Thủ Đức, 40 thuộc Quận 7.

Hỏi: người dùng báo "bản đồ không có gì ở Thủ Đức và trung tâm". Kết luận
nào đúng?

<!-- dap-an-chi -->

<details><summary>Đáp án</summary>

Bộ lọc mặc định giấy đúng 301 marker — trong đó trọn vẹn Thủ Đức và Quận 7.
Cách sửa đúng **không phải** tắt bộ lọc, mà là định vị thật cho các dự án
đó. Nếu chỉ bật `approximate` thì mọi khu vực sẽ mọc chấm ở *tâm quận* —
người dùng tưởng mọi dự án đều nằm ở một chỗ, càng tệ hơn.

Trong phiên này mình định vị 248 dự án bằng OpenStreetMap: 101 → 261/441
dự án có toạ độ thật.
</details>

---

## Lỗi 3 — Script kiểm tra báo xanh nhưng vô dụng

Một script Node quét mã nguồn tìm đường dẫn nội bộ thiếu tiền tố `/ami`
(thiếu thì link ra 404 trên GitHub Pages). Chạy trên Windows: **xanh**.
Chạy trong CI (Ubuntu): **đỏ**.

```js
const rel = file.replace(process.cwd() + '\\', '').replace(/\\/g, '/');
const src = readFileSync(join(SRC, rel.replace(/^web\/src\//, '')), 'utf8');
```

Trong CI, lỗi báo ra là:

```
Error: ENOENT: no such file or directory, open
  '/home/runner/work/ami/ami/web/src/home/runner/work/ami/ami/web/src/app/du-an/page.tsx'
```

Hỏi: vì sao, và sửa thế nào?

<details><summary>Đáp án</summary>

Dấu `\` chỉ có trong đường dẫn kiểu Windows. Trên Linux đường dẫn dùng `/`
nên `replace(cwd + '\\', '')` không khớp gì, `rel` giữ nguyên đường dẫn
tuyệt đối, rồi `join(SRC, ...)` ghép lại thành đường dẫn nhân đôi.

Sửa: dùng `relative(SRC, file)` của `node:path` — đúng ở cả hai hệ.

Điểm đáng nói: **chạy trên máy thì cả cách cũ lẫn cách mới cho kết quả
giống hệt nhau**, nên không thể phát hiện bằng mắt. Chỉ mô phỏng đường dẫn
POSIX mới thấy.
</details>

---

## Lỗi 4 — Bộ lọc trên URL bị bỏ qua

Đây là mã bộ lọc trong `lib/store.ts`:

```ts
export function applyFilters(rows: Listing[], f: Filters): Listing[] {
  if (f.type) rows = rows.filter((l) => l.type === f.type);
  if (f.category) rows = rows.filter((l) => l.category === f.category);
  if (f.project) rows = rows.filter((l) =>
    fold(l.project_name).includes(fold(f.project)));
  return rows;
}
```

Trang kết quả gọi:

```ts
const f = useState<Filters>(() => ({
  type:  sp.get('type')   || undefined,
  q:     sp.get('q')      || undefined,
  cat:   sp.get('cat')    || undefined,
  sort:  sp.get('sort')   || 'newest',
  page:  Number(sp.get('page')) || 1,
}));
```

Link từ bản đồ và thẻ dự án trỏ tới:

```
/tim-kiem/?project=prj-x40
```

Người dùng bấm vào một dự án và thấy **toàn bộ 27.659 tin đăng**, không
phải tin của dự án đó.

Có ba tầng nguyên nhân. Hãy tìm ra **đủ cả ba**, và cho biết tầng nào là
nguyên nhân *khiến người dùng nhìn thấy toàn bộ danh sách*.

<details><summary>Đáp án</summary>

**a) `Filters` không khai báo `project`** — dòng khai báo state thiếu hẳn
`project: sp.get('project')`. Bộ lọc có sẵn trong `applyFilters` nhưng trang
không truyền xuống. **Đây là tầng quyết định.**

**b) So mã với tên.** `f.project` là `prj-x40` (mã), còn `l.project_name`
lưu *tên* dự án ("Vạn Đô"). `includes("prj-x40")` không khớp tên nào.

**c) Vì không khớp gì, điều kiện lọc không loại tin nào** — `rows` giữ nguyên
toàn bộ, và trang hiện hết dataset. Người dùng thấy "bộ lọc hỏng".

Đáng chú ý: nếu chỉ sửa (b) mà chưa sửa (a) thì vẫn hỏng; nếu chỉ sửa (a)
thì (b) lộ ra ngay. Nhưng tầng nào khiến **người dùng nhìn thấy toàn bộ
27.659 tin** là tầng (a) — vì không có nó thì bộ lọc không bao giờ chạy.

Sau khi sửa (a): `Vạn Đô` ra đúng 5 tin, khớp với con số popup trên bản đồ.
</details>

---

## Câu hỏi tự đánh giá

1. Ở lỗi nào bạn **chỉ ra được nguyên nhân ngay từ đầu** mà không cần chạy
   thử? Khó nhất với lỗi nào?

2. Nếu được thêm công cụ (đọc file, chạy lệnh), bạn sẽ **kiểm chứng** lỗi
   nào trước, và kiểm chứng bằng cách nào? Nêu một cách kiểm chứng cụ thể
   cho ít nhất 2 lỗi.

3. Lỗi 3 dùng cách cắt chuỗi theo dấu phân cách của hệ điều hành. Hãy nêu
   một trường hợp khác mà cách tương tự đó sẽ hỏng, và cách viết đúng.

Trả lời ngắn gọn, đánh số theo từng lỗi. Không cần viết lại code dài.