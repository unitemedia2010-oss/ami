/* Kiểm chứng check_icon_size.mjs bằng ca CỐ Ý. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const CHECK = join(DIR, 'check_icon_size.mjs');

let thatSach = true;
try {
  execFileSync(process.execPath, [CHECK], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  thatSach = false;
  console.log('!! MÃ NGUỒN THẬT ĐANG LỖI — sửa hết rồi hãy kiểm chứng probe:');
  console.log((e.stdout || '') + (e.stderr || ''));
}

const CA = [
  ['icon thieu kich thuoc (LOI THAT — loai da xay ra tren ban live)',
   `  <Icons.MapPin className="text-zinc-400 shrink-0" />`, true],
  ['icon chi mau, thieu kich thuoc (LOI THAT)',
   `  <Icons.Bed className="text-zinc-400" />`, true],
  ['icon co kich thuoc (OK)',
   `  <Icons.ChevronDown className="w-3.5 h-3.5" />`, false],
  ['icon co kich thuoc va mau (OK)',
   `  <Icons.Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />`, false],
  ['icon goi khong truyen className, dung mac dinh (OK)',
   `  <Icons.Close />`, false],
];

const thuMuc = join(DIR, '..', 'web/src/__icon_probe');
let sai = 0;

try {
  if (!thatSach) { console.log('BO QUA probe: cay that chua sach.'); process.exit(1); }
  mkdirSync(thuMuc, { recursive: true });
  for (const [ten, noiDung] of CA) {
    writeFileSync(join(thuMuc, ten.replace(/[^a-zA-Z0-9]/g, '_') + '.tsx'), noiDung, 'utf8');
  }

  let ket = '';
  try {
    ket = execFileSync(process.execPath, [CHECK, 'web/src/__icon_probe'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(ket);
    console.log('SAI: script trả 0 trong khi cay thu nghiem co loi.');
    sai = CA.length;
  } catch (e) {
    const out = e.stdout || '';
    const bat = new Set(
      out.split('\n')
        .map((l) => (l.match(/^\s+(\S+\.tsx):(\d+)\s+<Icons/) || [])[1])
        .filter(Boolean),
    );
    for (const [ten, , canBat] of CA) {
      const tenFile = ten.replace(/[^a-zA-Z0-9]/g, '_') + '.tsx';
      const thucTe = bat.has(tenFile);
      if (thucTe !== canBat) sai++;
      console.log(`${thucTe === canBat ? 'OK  ' : 'SAI '} ${ten}` + (thucTe ? ' — bị bắt' : ' — bỏ qua'));
    }
    console.log(sai ? `\nFAIL: ${sai} ca sai.` : `\nOK: bắt đúng ${CA.filter(c=>c[2]).length} lỗi, bỏ qua ${CA.filter(c=>!c[2]).length} ca hợp lệ.`);
  }
} finally {
  rmSync(thuMuc, { recursive: true, force: true });
  if (existsSync(thuMuc)) console.log('!! khong don duoc thu muc thu nghiem');
}
process.exit(sai ? 1 : 0);