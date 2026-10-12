/* Trang nao KHONG co tieu de rieng — Google se gop nhieu trang vao cung mot
 * tieu de, va nguoi dung khong phan biet duoc tab nao la trang nao.
 *
 * VAI TRO CUA SCRIPT NAY: bat loi truoc khi len live, chay trong CI ngay sau
 * buoc build. No doc MA NGUON, khong phai ban da deploy.
 *
 * HAI BAY SAI DA LAM SCRIPT NAY DEM SAI LAN DAU — ghi la de khong lap lai:
 *
 *  1. `/quan/[slug]` bao "MAC DINH" hoan toan dung sai. File do co
 *     generateMetadata va tieu de tren ban live la dung. Ly do: vong duyet thu
 *     muc lay duong dan chu literal "/quan/[slug]", tai len URL do tra 404,
 *     <title> tra ve la cua trang loi, va regex MAC_DINH khop nham. Bay gio
 *     route dong bi bo qua o vong do va duoc them san tu districts.json.
 *
 *  2. `/` bao loi trong khi trang chu CHINH LA chu tieu de mac dinh — no la
 *     chu so sanh, khong phai trang can sua. So sanh phai bo qua no.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Cho phép trỏ sang cây thư mục khác để probe dựng ca thử nghiệm.
 * Khi có đối số, bỏ qua districts.json vì cây thử nghiệm không có nó. */
const THU_MUC_THU = process.argv[2];
const APP = THU_MUC_THU ? resolve(THU_MUC_THU) : join(ROOT, 'web/src/app');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/* Trang chủ giữ tieu de gốc trong layout, đó là chuẩn để so — không phải lỗi. */
const CHU_TIEU_DE = 'SGREALTY — Mua bán';

/* Một trang "đã có tieu de riêng" nếu họ khai báo trực tiếp, hoặc nằm trong
 * một layout nào đó khai báo. Layout là đường thoát chuẩn cho trang client:
 * trang 'use client' không export được metadata, nên phải đặt vào layout.tsx
 * cùng cấp — đó mới là cách sửa, không phải chuyển trang sang server. */
function coMetadata(dir, file) {
  const src = readFileSync(file, 'utf8');
  if (/export\s+const\s+metadata|generateMetadata/.test(src)) return true;

  /* Đi ngược lên từ thư mục trang, NHƯNG DỪNG TRƯỚC layout gốc.
   *
   * ⚠ Đây chính là chỗ làm script im lặng báo "OK" lần đầu tiên chạy.
   * layout.tsx ở gốc CÓ export metadata — nhưng đó là tiêu đề dự phòng
   * chung cho toàn site, tức chính là thứ đang bị phát hiện. Nếu cho phép
   * leo tới gốc, mọi trang đều "có metadata" và script báo xanh trong khi
   * 14 trang vẫn dùng chung một tiêu đề trên live.
   * Chỉ layout ở CẤP CON mới là tiêu đề riêng cho nhánh đó. */
  let d = dir;
  while (d !== APP && d.startsWith(APP)) {
    const lay = join(d, 'layout.tsx');
    try {
      const ls = readFileSync(lay, 'utf8');
      if (/export\s+const\s+metadata|generateMetadata/.test(ls)) return true;
    } catch { /* không có layout ở cấp này */ }
    d = dirname(d);
  }
  return false;
}

const thu = [];
for (const f of walk(APP)) {
  if (!f.endsWith('page.tsx')) continue;
  let r = '/' + relative(APP, f).replace(/\\/g, '/').replace(/\/?page\.tsx$/, '');
  r = r.replace(/\/$/, '') || '/';

  /* BỎ QUA route động: không có URL thật để tải. Các route động duy nhất
     là /quan/[slug], thêm ở vong sau. */
  if (r.includes('[')) continue;

  thu.push({
    duong: r,
    file: relative(APP, f).replace(/\\/g, '/'),
    coMetadata: coMetadata(dirname(f), f),
  });
}

/* Route động có generateMetadata riêng (đã xác minh trên bản live).
 * Chỉ áp dụng cho cây thật — cây thử nghiệm của probe không có file này. */
if (!THU_MUC_THU) {
  const ds = JSON.parse(readFileSync(join(ROOT, 'web/public/data/districts.json'), 'utf8'));
  for (const d of ds) thu.push({
    duong: '/quan/' + d.slug,
    file: 'quan/[slug]/page.tsx — generateMetadata',
    coMetadata: true,
  });
}

const ket = [];
for (const x of thu) {
  if (x.coMetadata) continue;
  if (x.duong === '/') continue;               // trang chủ là chuẩn so sánh
  if (x.duong.startsWith('/admin')) continue;   // trang quản trị, không cần SEO
  /* /kham-pha chưa commit nên chưa có trên live — không phải lỗi bản live. */
  if (x.duong === '/kham-pha') continue;
  ket.push({ duong: x.duong, file: x.file });
}

if (ket.length) {
  console.log(`✗ ${ket.length} trang dùng chung tieu de "${CHU_TIEU_DE}":\n`);
  for (const x of ket) console.log(`   ${x.duong.padEnd(24)} ${x.file}`);
  console.log(`
Cách sửa: tạo hoặc thêm vào layout.tsx cùng cấp với page.tsx —

    import type { Metadata } from 'next';
    export const metadata: Metadata = {
      title: 'Tên riêng của trang',
      description: 'Mô tả 1 câu.',
    };

Không sửa được bằng cách export metadata ngay trong page.tsx khi trang đó
có 'use client' — React không cho phép. Phải đặt ở layout.`);
  process.exit(1);
}
console.log(`OK: mọi trang công khai có tieu de rieng (trang chu là chuẩn so sánh).`);