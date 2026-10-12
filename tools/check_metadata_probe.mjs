/* Kiểm chứng check_metadata.mjs bằng các ca CỐ Ý.
 *
 * Vì sao cần probe: script này đã từng báo "OK" cho 14 trang thực sự còn
 * dùng chung tiêu đề. Nguyên nhân là vòng leo tìm metadata cho phép lên
 * tới layout.tsx ở gốc — nơi khai báo chính tiêu đề dự phòng chung. Mọi
 * trang đều "có metadata", script im lặng, và lỗi SEO đi thẳng lên live.
 *
 * Bài học: script báo sai còn tệ hơn không có script. Ở đây probe dựng cây
 * thư mục thật trong thư mục tạm rồi chạy script trên đó.
 *
 * CA SỐ 1 là ca đã làm hỏng thật — xem mô tả.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const CHECK = join(dirname(fileURLToPath(import.meta.url)), 'check_metadata.mjs');

/* Một layout gốc giống hệt layout thật của dự án. */
const LAYOUT_GOC = `import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'SGREALTY — Mua bán & Cho thuê bất động sản Sài Gòn',
  description: 'Tieu de du phong chung cho toan site.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="vi"><body>{children}</body></html>);
}
`;

/*                            tên file       nội dung              cần bắt
 * `bat` = true nghĩa là trang đó PHẢI bị báo thiếu metadata. */
const CA = [
  ['trang client khong co metadata (LOI THAT)',      'tim-kiem/page.tsx', `'use client';\nexport default function P(){return <div/>;}`, true],
  ['trang server co export metadata (OK)',           'chi-tiet/page.tsx', `import type { Metadata } from 'next';\nexport const metadata: Metadata = { title: 'Tin' };\nexport default function P(){return <div/>;}`, false],
  ['trang co generateMetadata (OK)',                 'quan/[slug]/page.tsx', `export async function generateMetadata(){return {};}\nexport default function P(){return <div/>;}`, false],
  ['layout cung cap metadata cho trang client (OK)', 'du-an/layout.tsx',   `import type { Metadata } from 'next';\nexport const metadata: Metadata = { title: 'Dự án' };`, false],
  ['trang client duoi layout khong co gi (LOI THAT)','ban-do/page.tsx',   `'use client';\nexport default function P(){return <div/>;}`, true],
  ['layout o cap con khong phai cap goc (OK)',       'kham-pha/layout.tsx', `import type { Metadata } from 'next';\nexport const metadata: Metadata = { title: 'Bản đồ mới' };`, false],
  ['trang quan tri khong can metadata (OK)',         'admin/page.tsx',    `'use client';\nexport default function P(){return <div/>;}`, false],
  ['trang chu dung chung tieu de goc (OK)',          'page.tsx',          `'use client';\nexport default function P(){return <div/>;}`, false],
  /* ↓ CA ĐÃ LÀM HỎNG THẬT — xem mô tả đầu file. Nếu bỏ đi, script sẽ
     lại leo lên layout gốc và báo xanh cho mọi trang. */
  ['layout GOC co metadata KHONG duoc tinh (LOI THAT)', 'so-sanh/page.tsx', `'use client';\nexport default function P(){return <div/>;}`, true],
];

const goc = mkdtempSync(join(tmpdir(), 'meta-probe-'));
let sai = 0;

try {
  /* layout gốc luôn có metadata — đúng như dự án thật */
  writeFileSync(join(goc, 'layout.tsx'), LAYOUT_GOC);

  for (const [ten, duongDoi, noiDung] of CA) {
    const p = join(goc, duongDoi);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, noiDung);
  }

  /* Script cố ý exit(1) khi tìm thấy lỗi, nên execFileSync sẽ ném.
   * Bắt lại và đọc stdout — nếu không, probe chết ngay lúc có lỗi thật,
   * tức là chỉ "chạy được" khi cây thử nghiệm sạch lỗi. */
  let ket = '';
  try {
    ket = execFileSync(process.execPath, [CHECK, goc], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    ket = (e.stdout || '') + (e.stdout ? '' : '');
  }

  const dong = ket.split('\n').filter((l) => /^ {3}\//.test(l)).map((l) => l.trim().split(/\s+/)[0]);
  const bat = new Set(dong);

  for (const [ten, duongDoi, , canBat] of CA) {
    const duong = '/' + duongDoi.replace(/page\.tsx$/, '').replace(/\/$/, '');
    const thucTe = bat.has(duong);
    const dung = thucTe === canBat;
    if (!dung) sai++;
    console.log(
      `${dung ? 'OK  ' : 'SAI '} ${ten}` +
      (thucTe ? ' — bị bắt' : ' — bỏ qua')
    );
  }

  console.log(sai
    ? `\nFAIL: ${sai} ca sai.`
    : `\nOK: script bắt đúng ${CA.filter((c) => c[3]).length} lỗi và bỏ qua ${CA.filter((c) => !c[3]).length} ca hợp lệ.`);
} finally {
  rmSync(goc, { recursive: true, force: true });
}

process.exit(sai ? 1 : 0);