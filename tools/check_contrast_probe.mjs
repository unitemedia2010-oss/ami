/* Kiểm chứng check_contrast_classes.mjs bằng các lỗi CỐ Ý.
   Sau khi thêm hai trường hợp loại trừ (tự đóng / aria-hidden), phải chắc
   là script vẫn bắt được lỗi gốc — lỗi thật đã xảy ra trong dự án này là
   chip nền kính tối với chữ đen.
   Nếu file này xanh, nghĩa là script đã bị nới lỏng quá tay. */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = join(ROOT, 'web/src/components/__contrast_probe.tsx');

/** Mỗi ca: [tên, jsx, có bị bắt không] */
const CASES = [
  ['chip kinh toi co chu den (loi that)', `
    <span className="px-3 py-1.5 rounded-full glass-dark text-[12px]">
      Nhom san
    </span>`, true],

  ['nut tren nen toi, thieu text-white (loi that)', `
    <div className="bg-coal-900 rounded-lg">
      <p>Dien thoai</p>
    </div>`, true],

  ['lop phu mo trang, tu dong, rong (KHONG phai loi)', `
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
         onClick={close} aria-hidden />`, false],

  ['lop phu gradient trang tri (KHONG phai loi)', `
    <div aria-hidden className="absolute inset-x-0 bottom-0 h-20
         bg-gradient-to-t from-black/55 to-transparent" />`, false],

  ['the co chu tren nen toi, da co text-white (OK)', `
    <div className="bg-flame-800 text-white px-3 py-1 rounded-full">
      Noi bat
    </div>`, false],

  ['the nen sang, khong can mau chu (OK)', `
    <div className="bg-white px-3 py-1 rounded-lg">
      Ten quan
    </div>`, false],

  /* Hai ca sau lấy từ trang /kham-pha: script đã báo động giả cho chúng
     trước khi được sửa. */
  ['lop phu modal toan man, con co nen rieng (KHONG phai loi)', `
    <div className="fixed inset-0 z-50 flex items-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 text-coal-900">
        Lien he
      </div>
    </div>`, false],

  ['khung anh nen toi, con la <img> (KHONG phai loi)', `
    <div className="relative aspect-video bg-black">
      <img src="/x.jpg" alt="" />
      <div className="absolute inset-0 text-white">Keo de xoay</div>
    </div>`, false],

  ['khung nen toi that su, phan tu con KHONG mang mau (loi that)', `
    <div className="relative aspect-video bg-black">
      <p>Khong ai gan mau chu</p>
    </div>`, true],
];

/* PHẢI kiểm mã nguồn thật TRƯỚC khi ghi file probe.
   Nếu mã nguồn đang có lỗi thật thì check_contrast_classes trả mã khác 0 vì
   lý do đó — mọi ca thử đều bị coi là "bị bắt", kể cả ca KHÔNG PHẢI lỗi.
   Lần chạy trước đúng vấp: 4 ca báo sai chỉ vì còn sót lỗi ở trang chủ.

   ⚠ Và PHẢI chạy TRƯỚC khi ghi file probe. Lần này đặt nhầm sau, nên nó
     thấy luôn lỗi của chính file thử nghiệm vừa ghi (trong đó cố tình có
     lỗi) và báo đỏ mãi. Đây là dạng "công cụ tưởng đang kiểm chứng, thực
     ra đang tự soi chính mình". */
if (existsSync(F)) unlinkSync(F);
let baselineSach = true;
try {
  execFileSync('node', [join(ROOT, 'tools/check_contrast_classes.mjs')],
    { cwd: ROOT, stdio: 'pipe' });
} catch {
  baselineSach = false;
  console.log('!! MÃ NGUỒN THẬT ĐANG CÓ LỖI — sửa hết trước khi kiểm chứng probe.');
}

writeFileSync(F, "'use client';\nexport default function P() {\n  return (\n    <div>\n"
  + CASES.map(([, jsx]) => jsx).join('\n') + '\n    </div>\n  );\n}\n', 'utf8');

let bad = 0;
for (const [ten, , phaiBat] of CASES) {
  let bat = false;
  try {
    execFileSync('node', [join(ROOT, 'tools/check_contrast_classes.mjs')],
      { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    bat = true;   // script trả exit khác 0 = có phát hiện
  }
  /* Script dừng ở ca đầu tiên bị bắt, nên kiểm tra từng ca riêng:
     thay nội dung file bằng đúng một ca rồi chạy lại. */
  writeFileSync(F, "'use client';\nexport default function P() {\n  return (\n    <div>\n"
    + CASES.find((c) => c[0] === ten)[1] + '\n    </div>\n  );\n}\n', 'utf8');
  bat = false;
  try {
    execFileSync('node', [join(ROOT, 'tools/check_contrast_classes.mjs')],
      { cwd: ROOT, stdio: 'pipe' });
  } catch { bat = true; }

  const dung = bat === phaiBat;
  if (!dung) bad++;
  console.log(`${dung ? 'OK  ' : 'SAI '} ${ten} — ${bat ? 'bị bắt' : 'bỏ qua'}`
    + (dung ? '' : ` (mong đợi ${phaiBat ? 'bị bắt' : 'bỏ qua'})`));
}

unlinkSync(F);
if (bad || !baselineSach) {
  if (bad) console.error(`\nFAIL: ${bad} ca sai.`);
  process.exit(1);
}
console.log('\nOK: script bắt đúng lỗi thật và bỏ qua lớp phủ rỗng.');
