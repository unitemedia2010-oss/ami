/* Chặn icon SVG bị phình to vì thiếu class kích thước.
 *
 * LỖI THẬT, thấy bằng mắt trên bản live của trang /kham-pha: một kính lúp
 * 286px và một ghim bản đồ 228px nằm đè lên nội dung. Nguyên nhân:
 *
 *     const Search = ({ className = "w-4 h-4" }) => <svg className={className} …>
 *     ...
 *     <Icons.Search className="text-zinc-400 shrink-0" />
 *
 * `className = "w-4 h-4"` là giá trị MẶC ĐỊNH của tham số, nên khi truyền
 * className khác thì "w-4 h-4" bị THAY CHỨ, không phải nối thêm. SVG mất
 * width/height, trình duyệt cho kích thước mặc định 300px.
 *
 * Build vẫn xanh, không lỗi console, chỉ lộ ra khi nhìn bằng mắt — nên
 * phải soát bằng máy.
 *
 * Cách soát: mọi lần gọi <Icons.Tên className="…"> phải có w-… hoặc h-…
 * trong class. Lần gọi không truyền className thì dùng mặc định, hợp lệ.
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

const loi = [];

for (const f of walk(SRC)) {
  if (!/\.(tsx|jsx)$/.test(f)) continue;
  const rel = relative(SRC, f).replace(/\\/g, '/');
  const lines = readFileSync(f, 'utf8').split('\n');

  lines.forEach((line, i) => {
    /* <Icons.Tên className="…"> — bắt cả dạng có lấy class trong biểu thức */
    for (const m of line.matchAll(/<Icons\.(\w+)\s+className="([^"]*)"/g)) {
      if (/\bw-\d|\bh-\d/.test(m[2])) continue;
      loi.push({ file: rel, dong: i + 1, ten: m[1], cls: m[2] });
    }
    /* dạng className={\`…` cũng cần bắt */
    for (const m of line.matchAll(/<Icons\.(\w+)\s+className=\{`([^`]*)`\}/g)) {
      if (/\bw-\d|\bh-\d/.test(m[2])) continue;
      loi.push({ file: rel, dong: i + 1, ten: m[1], cls: m[2] });
    }
  });
}

if (loi.length) {
  console.log(`✗ ${loi.length} icon thiếu class kích thước — sẽ phình to ~300px:\n`);
  for (const x of loi) {
    console.log(`   ${x.file}:${x.dong}  <Icons.${x.ten} className="${x.cls}" />`);
  }
  console.log(`
Cách sửa: thêm w-… h-… vào className, ví dụ
    <Icons.MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />

Không sửa được bằng cách sửa component cho nó nối w-4 h-4 vào: khi đó class
w-3.5 truyền từ ngoài và w-4 mặc định sẽ tranh nhau, mà Tailwind quyết định
thắng thua theo thứ tự rule trong CSS chứ không theo thứ tự trong class.`);
  process.exit(1);
}
console.log('OK: mọi icon được truyền className đều có kích thước tường minh.');