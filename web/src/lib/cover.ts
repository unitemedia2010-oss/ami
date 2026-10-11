/**
 * =============================================================================
 *  Ảnh đại diện tự sinh bằng SVG — không cần tải file ảnh nào
 *
 *  Vì sao:
 *    Bản JSON tĩnh đẩy lên GitHub Pages phải nhỏ gọn. Nếu nhúng sẵn ảnh
 *    (3 ảnh/tin × 788 tin ≈ 2,3 MB) thì trang chủ tải nặng vô lý. Nên ta chỉ
 *    lưu `hue` (số màu) của mỗi dự án rồi vẽ ảnh ngay trong trình duyệt.
 *    Kết quả: cùng một dự án luôn cho cùng màu ảnh, nhưng dữ liệu gần như
 *    không tốn byte.
 *
 *  ⚠ Ràng buộc kích thước: mỗi ảnh là một data-URI nằm ngay trong HTML, không
 *    được cache riêng và phải giải mã lại ở mỗi lần hiển thị. Bản đầu tiên
 *    sinh ra 12 KB/ảnh — trang chủ 24 card là 288 KB rác. Bản này giữ mặt
 *    trước nhìn gần như y hệt nhưng nhẹ hơn ~2,5 lần, nhờ:
 *      • toạ độ làm tròn số nguyên thay vì số thập phân dài
 *      • lưới cửa sổ thưa hơn (1 cửa ≈ 900 px² thay vì 400 px²)
 *      • bớt số toà nhà phía sau
 *
 *  Đây là ẢNH MINH HỌA, không phải ảnh thật của căn hộ. Khi có ảnh thật từ
 *  môi giới, `ListingCard` sẽ ưu tiên `l.images[0]` và bỏ qua hàm này.
 * ========================================================================== */

/** Băm chuỗi ra số để mọi thứ tất định — không dùng Math.random */
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG nhỏ, sinh cùng dãy số cho cùng seed */
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

const esc = (s: string) =>
  s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));

/**
 * Ép một góc màu bất kỳ về dải ấm của thương hiệu (cam 8° → đỏ 42°).
 *
 * ⚠ Vì sao cần: nếu cứ cộng hue thẳng (h + 34 → 73°) thì ảnh chuyển sang
 *   vàng chanh và xanh lá — lệch hẳn tông vàng-cam-đỏ của website.
 */
function warm(deg: number): number {
  const SPAN = 34;           // 8 … 42
  return 8 + (((deg - 8) % SPAN) + SPAN) % SPAN;
}

/**
 * Vẽ một ảnh SVG và trả về data-URI.
 *
 * @param name    tên dự án — dùng để băm, cùng tên luôn ra cùng ảnh
 * @param hue     0–360; mọi góc dùng để vẽ đều đi qua warm() nên không bao
 *                giờ rơi ra ngoài dải cam-đỏ, dù hue đầu vào là bao nhiêu
 * @param variant 0/1/2 — 3 góc nhìn khác nhau cho cùng một căn
 */
export function coverImage(name: string, hue: number, variant = 0): string {
  const rnd = rng(seedOf(`${name}#${variant}`));
  const h = warm(hue);
  const W = 640, H = 400;

  /* --- trời: chuyển sắc theo biến thể để 3 ảnh khác nhau rõ --- */
  const skyTop = variant === 0 ? `hsl(${h} 85% 60%)`
    : variant === 1 ? `hsl(${warm(h + 20)} 78% 54%)`
    : `hsl(${warm(h - 22)} 88% 56%)`;
  const skyMid = variant === 2 ? 'hsl(26 92% 56%)' : `hsl(${warm(h - 12)} 90% 50%)`;
  const skyBot = variant === 1 ? `hsl(${warm(h - 22)} 92% 40%)` : 'hsl(8 88% 36%)';

  /* --- mặt trời / quầng sáng --- */
  const sunX = Math.round(90 + rnd() * (W - 180));
  const sunY = Math.round(70 + rnd() * 90);
  const sunR = Math.round(34 + rnd() * 30);

  /* --- các toà nhà phía sau --- */
  let back = '';
  let x = -20;
  const r2 = rng(seedOf(`${name}#b${variant}`));
  while (x < W + 20) {
    const bw = Math.round(50 + r2() * 80);
    const bh = Math.round(80 + r2() * 120);
    back += `<rect x="${Math.round(x)}" y="${Math.round(H - 60 - bh)}" width="${bw}" height="${bh + 60}" fill="hsl(${warm(h + 18)} 55% 22%)" opacity="${(0.3 + r2() * 0.2).toFixed(1)}"/>`;
    x += bw + 8 + r2() * 20;
  }

  /* --- toà chính: 3–5 khối, có lưới cửa sổ và mái chóp --- */
  let towers = '';
  const r3 = rng(seedOf(`${name}#m${variant}`));
  let tx = 60 + r3() * 80;
  const n = 3 + Math.floor(r3() * 3);
  for (let i = 0; i < n; i++) {
    const tw = Math.round(58 + r3() * 70);
    const th = Math.round(110 + r3() * 170);
    const ty = H - 46 - th;

    towers += `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="4" fill="url(#f)"/>`;

    // lưới cửa sổ — ô 26×34 để SVG nhẹ, nhìn xa vẫn rõ là cao tầng
    const cols = Math.max(2, Math.round((tw - 16) / 26));
    const rows = Math.max(3, Math.round((th - 16) / 34));
    const cw = Math.round((tw - 16) / cols - 7);
    const ch = Math.round((th - 16) / rows - 9);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (r3() < 0.3) continue;                      // bỏ ngẫu nhiên cho đỡ chặt
        const lit = r3() < 0.22;                       // cửa sổ đang sáng
        towers += `<rect x="${Math.round(tx + 8 + (c * (tw - 16)) / cols)}" y="${Math.round(ty + 10 + (r * (th - 16)) / rows)}" width="${cw}" height="${ch}" fill="${lit ? '#FFE9A8' : '#F5EDE3'}" opacity="${lit ? 0.92 : 0.36}"/>`;
      }
    }

    // đường chỉa mái
    towers += `<path d="M${tx - 4} ${ty}L${Math.round(tx + tw / 2)} ${Math.round(ty - 16 - r3() * 18)}L${tx + tw + 4} ${ty}Z" fill="hsl(${warm(h + 10)} 70% 34%)" opacity="0.9"/>`;
    tx += tw - 12 + r3() * 34;
  }

  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(name)}"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="${skyTop}"/><stop offset=".52" stop-color="${skyMid}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient><linearGradient id="f" x2="0" y2="1"><stop stop-color="hsl(${warm(h + 14)} 62% 40%)"/><stop offset="1" stop-color="hsl(${warm(h + 4)} 68% 24%)"/></linearGradient><radialGradient id="g"><stop stop-color="#FFF3C4" stop-opacity=".95"/><stop offset=".45" stop-color="#FFD37A" stop-opacity=".5"/><stop offset="1" stop-color="#FFD37A" stop-opacity="0"/></radialGradient><linearGradient id="d" x2="0" y2="1"><stop stop-color="hsl(${warm(h + 6)} 45% 17%)"/><stop offset="1" stop-color="hsl(20 45% 11%)"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/><circle cx="${sunX}" cy="${sunY}" r="${sunR * 3}" fill="url(#g)"/><circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="#FFF0BE" opacity=".95"/>${back}<rect y="${H - 60}" width="${W}" height="60" fill="url(#d)"/>${towers}<rect y="${H - 46}" width="${W}" height="46" fill="url(#d)"/><rect y="${H - 46}" width="${W}" height="2" fill="#FFD37A" opacity=".35"/></svg>`;

  // encodeURIComponent là bắt buộc: raw SVG có # và < > sẽ phá data-URI
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Ảnh bìa dự án khi CHƯA có ảnh thật.
 *
 * ⚠ Đã bỏ tranh vẽ toà nhà. Tranh trông giống ảnh thật nhưng không phải ảnh
 *   của dự án đó → người xem dễ hiểu nhầm. Nay thẻ dự án hiển thị nền
 *   gradient kèm tên dự án (xem ProjectCover trong components/ListingCard.tsx).
 *
 *   Hàm này giữ lại cho chỗ cần một hình minh hoạ bất kỳ (ví dụ tin đăng
 *   không có ảnh).
 */
export function projectCover(name: string, hue?: number | null) {
  return coverImage(name, hue ?? 18, 0);
}