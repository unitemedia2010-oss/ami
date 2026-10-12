/**
 * Soát lớp tương phản: chữ trên nền tối mà KHÔNG có màu chữ tương minh.
 *
 * ⚠ Vì sao cần:
 *   Đã có một lần giao diện hiện dãy chip nền kính tối với chữ ĐEN — không
 *   đọc được. Nguyên nhân: class `text-white` bị quên, nên chữ kế thừa màu
 *   mặc định của trang (gần như đen) trong khi nền là gradient đậm.
 *   Build vẫn thành công, không có cảnh báo nào.
 *
 *   Nhận biết: phần tử có nền tối (bg-gradient tối, glass-dark, bg-black…)
 *   mà className KHÔNG chứa bất kỳ class text- nào (kể cả hover:/focus:)
 *   và không phải <button> (mặc định đã có màu riêng).
 *
 *   Cách dùng:  node tools/check_contrast_classes.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'web/src');

// class nền tối — nếu dùng mà nền sáng thì chữ mặc định không sao
const DARK_BG = /\b(?:bg-black|bg-coal-|glass-dark|bg-grad-heat|bg-flame-[789]00|bg-amber-900)/;
const HAS_TEXT = /\btext-[a-z]/;

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const suspects = [];

for (const file of walk(SRC)) {
  if (!/\.tsx$/.test(file)) continue;
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    // gom className có thể trải nhiều dòng: từ className= tới dấu >
    if (!/className=/.test(line)) return;
    let chunk = line;
    let j = i;
    while (!/>$/.test(chunk.trim()) && j + 1 < lines.length && j - i < 8) {
      j++;
      chunk += '\n' + lines[j];
    }

    /* Nhin tiếp 5 dòng phía dưới. Chunk chỉ dừng ở dấu `>` mở thẻ, nên
       phần tử con nằm NGOÀI chunk — ví dụ `<div className="…bg-black">`
       rồi mới tới `<img …>`. Không nhìn tiếp thì khung ảnh bị báo nhầm. */
    const phiaDuoi = lines.slice(j + 1, j + 6).join('\n');
    if (!DARK_BG.test(chunk)) return;
    if (HAS_TEXT.test(chunk)) return;

    /* ---- Loại trừ: lớp phủ trang suốt, không chứa chữ ----
     * Ví dụ lớp mờ bấm-để-đóng bảng nâng:
     *     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
     * Nền đen đó chỉ để làm tối phần còn lại, bên trong rỗng — không có chữ
     * nào để mà không đọc được. Bắt buộc thêm text-white chỉ để làm script
     * im là lẽ ra phải im, và tệ hơn là dạy ta rằ có thể bỏ qua lỗi thật.
     *
     * Hai tín hiệu, cùng đáng tin:
     *   • tự đóng (`/>` cuối chunk) → không có phần tử con, không thể có chữ
     *   • aria-hidden → theo quy ước dùng trong dự án, đánh dấu trang trí
     *     (lớp phủ gradient, vùng bấm vô hình) chứ không phải nội dung đọc
     * Lỗi thật trước đây là chip `<span>` có chữ bên trong → không rơi vào
     * hai trường hợp này nên vẫn bị bắt.
     */
    /* THÊM hai trường hợp, lấy từ lỗi thật ở trang /kham-pha:
         · `fixed inset-0` — lớp phủ toàn màn của hộp thoại. Nền đen chỉ để
           làm mờ phần còn lại; mọi chữ nằm trong thẻ con có nền riêng
           (modal liên hệ nền trắng, modal 360° nền zinc-950).
         · chứa `<img` — khung chứa ảnh (`relative aspect-video bg-black`).
           Nền tối ở đó là để ảnh nổi lên, chữ do phần tử con tự mang màu.
       Lỗi thật trước đây là chip <span> có chữ bên trong: không rơi vào hai
       trường hợp này nên vẫn bị bắt. */
    const tuDong = /\/>\s*$/.test(chunk);
    const trangTri = /aria-hidden/.test(chunk);
    const lopPhuToanMan = /fixed\s+inset-0/.test(chunk);
    /* `<img>` hoặc phần tử con có nền sáng riêng (`bg-white`,
       `bg-zinc-950`…) → nền tối ở đây chỉ làm nền lót, chữ thuộc con. */
    const conCoNenRieng =
      /<img\b/.test(chunk) || /<img\b/.test(phiaDuoi)
      || /className="[^"]*\bbg-(white|cream|zinc-50|zinc-100|zinc-900|zinc-950)\b/.test(phiaDuoi);
    if (tuDong || trangTri || lopPhuToanMan || conCoNenRieng) return;

    // <button> và <a> thường đã có màu chữ từ lớp cha — bỏ qua <button>
    if (/<\s*button\b/.test(chunk)) return;

    const m = chunk.match(/className="([^"]*)"/) || chunk.match(/className=\{`([^`]*)`\}/);
    suspects.push({
      /* relative() chứ không phải replace(cwd + '\\'): cách cắt bằng chuỗi
         chỉ đúng trên Windows, trên Linux dấu `\` không khớp nên đường dẫn
         hiển thị thành toàn bộ đường dẫn tuyệt đối. */
      file: relative(process.cwd(), file),
      line: i + 1,
      cls: (m ? m[1] : chunk).replace(/\s+/g, ' ').trim().slice(0, 70),
    });
  });
}

if (suspects.length === 0) {
  console.log('OK: không có phần tử nền tối nào thiếu màu chữ tường minh.');
} else {
  console.log(`✗ ${suspects.length} chỗ có nền tối nhưng không khai báo màu chữ:\n`);
  for (const s of suspects) console.log(`   ${s.file}:${s.line}\n      ${s.cls}\n`);
  console.log('Cách sửa: thêm `text-white` (hoặc `hover:text-white` nếu chỉ lúc hover).');
  process.exitCode = 1;
}