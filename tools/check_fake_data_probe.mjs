/* Kiểm chứng check_fake_data.mjs bằng các ca CỐ Ý.
 *
 * Theo quy ước dự án: mỗi script soát đều có probe chạy các lỗi thật đã
 * từng xảy ra. Ở đây nguyên nhân khiến script hỏng lặp lại là im lặng —
 * nên probe chạy trước trên cây thật, chỉ ghi file thử nghiệm khi cây thật
 * SẠCH, rồi dọn sạch trước khi kết luận.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const CHECK = join(DIR, 'check_fake_data.mjs');

/* Bước 1 — cây thật phải sạch. Nếu không sạch thì mọi ca "được bắt" bên
 * dưới đều là báo động giả, và ta mất khả năng phân biệt. */
let thatSach = true;
try {
  execFileSync(process.execPath, [CHECK], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  thatSach = false;
  console.log('!! MÃ NGUỒN THẬT ĐANG CÓ DỮ LIỆU BỊA — sửa hết rồi hãy kiểm chứng probe:');
  console.log((e.stdout || '') + (e.stderr || ''));
}

const thu = 'web/src/__fake_probe';
const CA = [
  ['anh chụp nguoi that tu unsplash (LOI THAT)',
   `const a = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120";`, true],
  ['anh placeholder (LOI THAT)',
   `const b = "https://via.placeholder.com/300";`, true],
  ['tel: toi so di dong that (LOI THAT)',
   `<a href="tel:0903123456">Gọi ngay</a>`, true],
  ['toa do sinh theo cong thuc luoi (LOI THAT)',
   `return { lat: 10.7800 + (idx % 4) * 0.008, lng: 106.7050 };`, true],
  ['diem danh gia sinh ra (LOI THAT)',
   `const item = { rating: 4.8 + (idx % 3) * 0.1 };`, true],
  ['toa do lay tu du lieu (OK)',
   `return { lat: item.project_lat, lng: item.project_lng };`, false],
  ['so 1900 cho trong (OK)',
   `<a href="/lien-he/">1900 xxx xxx</a>`, false],
  ['gia tri tinh toan khong phai toa do (OK)',
   `const tong = 10.5 + 3.2;`, false],
  ['truong ten hop le (OK)',
   `const duongDan = "/chi-tiet/";`, false],
];

let sai = 0;
const thuMuc = join(DIR, '..', thu);

try {
  if (!thatSach) {
    console.log('BỎ QUA probe: cây thật chưa sạch, ca thử nghiệm sẽ cho kết quả không đáng tin.');
    process.exit(1);
  }

  mkdirSync(thuMuc, { recursive: true });
  for (const [ten, noiDung] of CA) {
    writeFileSync(join(thuMuc, ten.replace(/[^a-zA-Z0-9]/g, '_') + '.ts'), noiDung, 'utf8');
  }

  const ket = execFileSync(process.execPath, [CHECK, thu], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(ket);
  console.log('SAI: script trả về 0 trong khi cây thử nghiệm cố tình chứa lỗi.');
  sai = CA.length;
} catch (e) {
  const out = e.stdout || '';
  /* Script in dòng vị trí lỗi ở dạng `   <đường dẫn tương đối>:<số dòng>`.
   * Đường dẫn TƯƠNG ĐỐI so với thư mục truyền vào — lúc trước probe lọc theo
   * tên thư mục thử nghiệm nên không dòng nào khớp, kết quả là mọi ca đều bị
   * báo "bỏ qua", tức là probe báo sai chứ không phải script báo sai. */
  const bat = new Set(
    out.split('\n')
      .map((l) => (l.match(/^\s+(\S+\.(?:tsx|ts|jsx|js|css)):(\d+)\s*$/) || [])[1])
      .filter(Boolean),
  );
  for (const [ten, noiDung, canBat] of CA) {
    const tenFile = ten.replace(/[^a-zA-Z0-9]/g, '_');
    /* `includes` chứ không phải `endsWith`: dòng báo lỗi có dạng
     * `web/src/<thu muc>/<ten file>.ts:12` — tên file nằm giữa, không phải
     * cuối, nên endsWith luôn trượt và probe báo "SAI" cho cả ca hợp lệ. */
    const thucTe = [...bat].some((b) => b.includes(tenFile));
    const dung = thucTe === canBat;
    if (!dung) sai++;
    console.log(
      `${dung ? 'OK  ' : 'SAI '} ${ten}` + (thucTe ? ' — bị bắt' : ' — bỏ qua')
    );
  }
  console.log(sai ? `\nFAIL: ${sai} ca sai.` : `\nOK: bắt đúng ${CA.filter((c) => c[2]).length} lỗi, bỏ qua ${CA.filter((c) => !c[2]).length} ca hợp lệ.`);
} finally {
  rmSync(thuMuc, { recursive: true, force: true });
  if (existsSync(thuMuc)) console.log('!! khong don duoc thu muc thu nghiem');
}

process.exit(sai ? 1 : 0);