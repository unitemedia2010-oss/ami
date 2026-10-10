# 3D Map Showcase — Demo hiệu ứng bản đồ BĐS như TikTok

Demo tái hiện hiệu ứng trong video quảng cáo BĐS với **timeline ghép cảnh đầy đủ**:

```
t=0.0  Loader logo → bay mất, letterbox điện ảnh, quét scan quang học
t=0.3  Camera dive: nhìn từ trên xuống → nghiêng 70° bay vào khu đất (6.2s)
t=1.2  Nền tối lặng lẽ nuốt khu vực xung quanh (khoét lỗ khu đất)
t=3.0  Khu đất phát sáng + 3 vòng radar lan ra nhịp nháy
t=3.6  Lưới blueprint hiện bên trong khu đất
t=4.0  Tuyến đường "châm lửa" + 2 quang huyệt chạy dọc tuyến
t=4.2  16 tòa nhà 3D mọc lên so le, vương miện sáng trên đỉnh
t=5.0  Pin "Nam Rạch Chiếc" + 2 nhãn phụ rớt xuống
t=6.4  Logo dự án GRAND RIVERSIDE
t=7.0  4 thẻ số liệu dự án hiện lần lượt (viện mô phỏng)
t=8.6  CTA Sale Gallery nhấp nháy
t=8.5+ Camera tự xoay chậm + "thở" zoom quanh dự án
```

Ngoài ra: nút ☾ chuyển **ngày/đêm** (bản đồ tối dần, glow mạnh lên),
nút ↺ **xem lại từ đầu**, film grain + vignette + thanh letterbox điện ảnh.

## Chạy demo

Chỉ cần mở `index.html` bằng trình duyệt (double-click là chạy).
Cần internet để tải MapLibre GL JS + tile vệ tinh Esri (đều miễn phí, không cần token/API key).

Hoặc chạy local server nếu muốn:

```bash
npx serve .
```

## Tùy chỉnh nhanh (trong `index.html`)

| Muốn đổi | Sửa ở |
|---|---|
| Vị trí dự án | `CENTER` (lng, lat) |
| Hình dáng khu đất | mảng `SITE` (tọa độ mét, tâm = CENTER) |
| Tòa nhà 3D (vị trí, chiều cao) | mảng `BLD` |
| Tuyến đường phát sáng | mảng `ROAD` |
| Nhãn pin "Nam Rạch Chiếc" | HTML trong `pinEl.innerHTML` + `PIN_AT` |
| Tên/logo dự án | khối `<div class="brand">` |
| Caption dưới màn hình | khối `<div class="caption">` |
| Màu glow | biến CSS `--gold`, `--mint` và các layer `*-glow-*` |

## Hiệu ứng nào → kỹ thuật nào

- **Map vệ tinh nghiêng** → raster tiles Esri + `pitch: 70`
- **Nền tối, khu đất sáng (ảnh 2)** → fill layer đen phủ toàn map, khoét lỗ (hole) tại polygon khu đất
- **Khu đất phát sáng** → fill opacity nhấp nháy + 3 line layer chồng nhau (width/blur tăng dần) giả lập glow
- **Tòa nhà 3D** → `fill-extrusion`, animate `fill-extrusion-height` theo thời gian
- **Tuyến đường sáng** → 3 line layer glow màu vàng
- **Pin nhãn + ripple** → Marker HTML/CSS thuần, ripple xoay `rotateX` để nằm phẳng mặt đất
- **Camera bay + xoay quanh** → `flyTo()` + vòng lặp `requestAnimationFrame` tăng `bearing`
- **Vignette tối góc** → CSS `radial-gradient` + `box-shadow: inset`

## Nâng cấp lên bản "xịn" hơn

- **Mapbox GL JS v3** — Standard style có sẵn 3D buildings, ánh sáng, thời tiết (cần token miễn phí)
- **CesiumJS + Google Photorealistic 3D Tiles** — ảnh 3D thật toàn thành phố, giống Google Earth nhất
- **Three.js custom layer** — nhúng model glTF tòa nhà thật (từ kiến trúc sư) lên đúng vị trí map
- **deck.gl** — thêm TripsLayer (xe chạy), ArcLayer (kết nối), HeatmapLayer...

> Ghi chú: các video TikTok thật thường được dựng offline bằng **Google Earth Studio + After Effects**,
> không phải web real-time. Nhưng với stack trên, web có thể đạt 80–90% hiệu ứng tương tự,
> lại tương tác được (xoay, zoom, click vào tòa nhà xem thông tin căn hộ...).
