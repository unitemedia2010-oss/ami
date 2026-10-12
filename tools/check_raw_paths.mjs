/**
 * Soát mọi `href`/`src` dạng chuỗi THÔ bắt đầu bằng "/" mà không qua u().
 *
 * ⚠ Vì sao cần:
 *   Khi deploy ở project site của GitHub, mọi đường dẫn phải có tiền tố
 *   /ami. Next tự gắn cho <Link>, nhưng KHÔNG gắn cho:
 *     • <a href="/…"> trong JSX
 *     • <a href="…"> do Leaflet dựng bằng chuỗi HTML trong popup
 *     • <img src="/…">
 *   Thiếu tiền tố → 404 "There isn't a GitHub Pages site here". Đã xảy ra
 *   thật: bấm "Xem tin →" trên bản đồ ra 404, và nhiều tin khác nếu chưa
 *   ai bấm tới.
 *
 *   Bỏ qua `u(...)` (đã gắn sẵn) và `u('/…')`.
 *
 *   Cách dùng:  node tools/check_raw_paths.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'web/src');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/* Chỉ bắt <a href="…"> (a thường) và trường `href:` gán vào MapPoint.
   KHÔNG bắt <Link href="…">: Next tự gắn basePath cho Link nên vẫn đúng.
   Bắt nhầm Link sẽ ra 59 cảnh báo trong đó 58 cái vô lỗi — lúc đó người
   ta chỉ cần tắt script đi khỏi báo. */
const RE_A = /<a\b[^>]*?\bhref\s*=\s*(?:"(\/[^"]*)"|\{\s*`(\/[^`]*)`)/gs;
const RE_OBJ = /^\s*href:\s*(?:`(\/[^`]*)`|u\()/;

const offenders = [];
let tong = 0;

/* Dùng để tìm khoảng trắng trước href để biết có phải <a hay <Link. */
function laTheA(src, idx) {
  const truoc = src.slice(Math.max(0, idx - 220), idx);
  const mo = Math.max(truoc.lastIndexOf('<a'), truoc.lastIndexOf('<a '));
  const link = truoc.lastIndexOf('<Link');
  if (mo < 0) return false;
  // nếu <Link mở ra sau <a gần nhất thì thuộc về Link
  return link < mo;
}

for (const file of walk(SRC)) {
  if (!/\.tsx?$/.test(file)) continue;
  const rel = file.replace(process.cwd() + '\\', '').replace(/\\/g, '/');
  const src = readFileSync(join(SRC, rel.replace(/^web\/src\//, '')), 'utf8');

  for (const m of src.matchAll(RE_A)) {
    tong++;
    const idx = m.index ?? 0;
    if (!laTheA(src, idx)) continue;
    const dong = src.slice(0, idx).split('\n').length;
    const line = src.split('\n')[dong - 1] ?? '';
    if (/\bu\(/.test(line)) continue;
    offenders.push({ rel, line: dong, code: `<a href="${(m[1] || m[2] || '').slice(0, 46)}…"` });
  }

  /* href: gán vào MapPoint để Leaflet đưa vào popup.
     Bỏ qua dòng đã bọc u(...). */
  src.split('\n').forEach((line, i) => {
    const m = line.match(RE_OBJ);
    if (!m) return;
    tong++;
    if (/^\s*href:\s*u\(/.test(line)) return;
    offenders.push({ rel, line: i + 1, code: line.trim().slice(0, 60) });
  });
}

if (offenders.length === 0) {
  console.log(`OK: cả ${tong} đường dẫn nội bộ đều qua u() — không có link thiếu tiền tố /ami.`);
} else {
  console.log(`✗ ${offenders.length} đường dẫn dạng thô, thiếu tiền tố /ami:\n`);
  for (const o of offenders) console.log(`   ${o.rel}:${o.line}\n     ${o.code}\n`);
  console.log('Sửa: import { u } từ "@/lib/basePath" rồi bọc:  href={u("/duong-dan")}');
  process.exitCode = 1;
}
