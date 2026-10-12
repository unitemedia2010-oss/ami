/* Chặn dữ liệu BỊA lọt vào mã nguồn.
 *
 * Dự án này dựng trên 27.659 tin thật. Nguyên tắc đã chốt: tin thật thì phải
 * hiện đúng thứ thật — ảnh thật, toạ độ thật, số liệu thật, và thiếu thì
 * nói là thiếu. Trang /kham-pha vi phạm cả ba:
 *
 *   · ảnh   — lấy ảnh chụp mặt người thật và ảnh căn hộ từ Unsplash
 *   · điện thoại — điền "0903 123 456" kèm href="tel:..." đúng định dạng
 *   · toạ độ — sinh theo công thức lưới 10.7800 + (idx % 4) * 0.008
 *   · đánh giá — sinh theo 4.8 + (idx % 3) * 0.1, dù dữ liệu không có trường này
 *
 * Ba nhóm đều là loại lỗi mà kiểm thử thường không bắt: trang vẫn hiện, vẫn
 * đẹp, không crash. Chỉ bắt được bằng cách cấm thẳng mẫu hình.
 *
 * Ý nghĩa từng quy tắc:
 *  1. HOST ẢNH KHO — Unsplash, picsum, placeholder… trả về ảnh của người
 *     KHÁC. Gán vào tin thật là nói dối người xem. (Ngoại lệ: file .probe.)
 *  2. tel: TỚI SỐ DI ĐỘNG THẬT — "0903123456" là số của một người thật, bấm
 *     là gọi nhầm. 1900 xxx xxx mới là dạng chỗ trống an toàn.
 *  3. TOẠ ĐỘ TÍNH RA — chấm bản đồ phải lấy toạ độ từ dữ liệu, không tự
 *     sinh. Đây đúng là lỗi "dồn chấm ở tâm quận".
 *  4. ĐÁNH GIÁ TÍNH RA — dữ liệu không có trường đánh giá, nên mọi con số
 *     chấm sao đều là bịa.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2] ? join(ROOT, process.argv[2]) : join(ROOT, 'web/src');

function walk(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const QUY_TAC = [
  {
    ten: 'anh kho cua nguoi khac (unsplash/picsum/placeholder)',
    re: /images\.unsplash\.com|source\.unsplash\.com|picsum\.photos|via\.placeholder\.com|loremflickr\.com|placekitten/i,
    sua: 'Bỏ hẳn. Tin không có ảnh thì dùng nền gradient + tên (xem nenThayAnh).',
  },
  {
    ten: 'tel: tro toi so di dong that',
    re: /tel:\s*0[3-9]\d{8}/,
    sua: 'Để số ở dạng chỗ trống "1900 xxx xxx" và cho nút trỏ sang /lien-he, không gọi được.',
  },
  {
    ten: 'toa do tu tinh ra thay vi lay tu du lieu',
    re: /\b(?:lat|lng)\s*:\s*\d{1,3}\.\d+\s*[+\-*/]/,
    sua: 'Lấy toạ độ từ trường của dữ liệu (project_lat / project_lng). Thiếu thì không chấm.',
  },
  {
    ten: 'diem danh gia tu tinh ra',
    re: /\brating\s*:\s*\d+\.\d+\s*[+\-]/,
    sua: 'Dữ liệu không có trường đánh giá. Bỏ hẳn, thay bằng loại hình nhà đất.',
  },
];

const loi = [];

for (const f of walk(SRC)) {
  if (!/\.(tsx|ts|jsx|js|css)$/.test(f)) continue;
  /* file thử nghiệm của probe chứa mẫu lỗi cố ý, không phải lỗi thật */
  if (f.includes('.probe') || f.endsWith('.probe.tsx') || f.endsWith('.probe.ts')) continue;

  const rel = relative(SRC, f).replace(/\\/g, '/');
  const lines = readFileSync(f, 'utf8').split('\n');

  lines.forEach((line, i) => {
    for (const q of QUY_TAC) {
      if (!q.re.test(line)) continue;
      /* bỏ qua dòng nằm trong chú thích — mô tả lỗi cũng chứa từ khoá */
      const laChuThich = /^[\s/*]*(\*|\/\/)/.test(line) || /\/\*|\*\//.test(line);
      loi.push({ quyTac: q.ten, file: rel, dong: i + 1, code: line.trim().slice(0, 86), chuThich: laChuThich });
    }
  });
}

const that = loi.filter((x) => !x.chuThich);

if (that.length) {
  console.log(`✗ ${that.length} chỗ dùng dữ liệu bịa:\n`);
  for (const x of that) {
    console.log(`  [${x.quyTac}]`);
    console.log(`     ${x.file}:${x.dong}`);
    console.log(`     ${x.code}\n`);
  }
  for (const q of QUY_TAC) {
    const c = that.filter((x) => x.quyTac === q.ten).length;
    if (c) console.log(`• ${q.ten}: ${c} chỗ\n  → ${q.sua}\n`);
  }
  process.exit(1);
}

const trongChuThich = loi.length - that.length;
console.log('OK: không có dữ liệu bịa nào trong mã nguồn.');
if (trongChuThich) {
  console.log(`   (${trongChuThich} dòng chỉ nhắc tới trong chú thích — bỏ qua, đúng ý.)`);
}