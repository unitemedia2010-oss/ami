#!/usr/bin/env node
/**
 * ============================================================================
 *  TẢI TÊN + SỐ ĐIỆN THOẠI CHỦ TIN  (có tồn kết quả từng tin)
 * ----------------------------------------------------------------------------
 *  Mỗi tin trừ 10 C-coin. Vì vậy script được viết thật "cẩn thận":
 *    • ghi kết quả NGAY sau mỗi tin vào contacts.json  (mất mạng cũng không mất)
 *    • tự dừng + chờ khi bị RATE_LIMIT (HTTP 429), rồi chạy tiếp
 *    • bỏ qua tin đã lấy → chạy lại là tiếp tục, không tốn thêm coin
 *    • có báo giá + xác nhận trước khi trừ credit
 *
 *  Chuẩn bị token: copy(await firebase.auth().currentUser.getIdToken(true))
 *  trong DevTools Console của trang đã đăng nhập, rồi lưu vào file .token
 *
 *  Dùng:
 *    node contact.js --from=thu-thiem-can-ho.json --limit=56 --wait=660
 *    node contact.js --ids=CHNT-018342,CHNT-017809 --yes
 * ============================================================================
 */
const fs = require('fs');
const API = 'https://khonhachinhchu.as.r.appspot.com/api/listing-contact';
const COST = 10;
const OUT = 'contacts.json';

const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const h = argv.find(a => a.startsWith(`--${k}=`) || a === `--${k}`);
  if (!h) return d;
  return h.includes('=') ? h.split('=').slice(1).join('=') : true;
};
const IDS = arg('ids', '');
const FROM = arg('from', '');
const LIMIT = parseInt(arg('limit', '99999'), 10);
const DELAY = parseInt(arg('delay', '4000'), 10);       // 4s/lần — an toàn với rate-limit
const WAIT0 = parseInt(arg('wait', '0'), 10);          // chờ trước khi bắt đầu (giây)
const YES = !!arg('yes', false);
const MAX_RETRY = parseInt(arg('maxretry', '3'), 10);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TOKEN = (() => {
  if (arg('token', null)) return String(arg('token'));
  try { return fs.readFileSync('.token', 'utf8').trim(); } catch { return ''; }
})();

// ------------------------------------------------ tồn kết quả (resume được)
const store = fs.existsSync(OUT)
  ? (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return {}; } })()
  : {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(store, null, 2), 'utf8');

// ------------------------------------------------ chuẩn bị danh sách tin
let items = [];
if (FROM) {
  const rows = JSON.parse(fs.readFileSync(String(FROM), 'utf8'));
  items = rows.slice(0, LIMIT).map(r => ({
    id: r.id, duAn: r.duAn, gia: r.giaHienThi, soPhongNgu: r.soPhongNgu,
    soTang: r.soTang, link: r.link, moTa: (r.moTa || '').slice(0, 90),
  }));
} else if (IDS) {
  items = String(IDS).split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id }));
}

(async () => {
  if (!TOKEN || TOKEN.length < 50) {
    console.error('✖ Thiếu token. Lưu token vào file .token hoặc dùng --token=...');
    process.exit(1);
  }
  if (!items.length) {
    console.error('✖ Không có tin nào. Dùng --from=<file.json> hoặc --ids=CHNT-xxx');
    process.exit(1);
  }

  const todo = items.filter(i => !store[i.id] || store[i.id].err);
  console.error(`\n  Tổng ${items.length} tin · chưa lấy ${todo.length} · đã có ${items.length - todo.length}`);
  if (!todo.length) { console.error('✔ Đã lấy đủ. Xem contacts.json'); return; }
  console.error(`  Chi phí dự kiến: ${todo.length} × ${COST} = ${todo.length * COST} C-coin\n`);
  todo.slice(0, 8).forEach(i => console.error(`   · ${i.id} ${i.duAn || ''} ${i.gia || ''}`));
  if (todo.length > 8) console.error(`   … và ${todo.length - 8} tin nữa`);
  console.error('');

  if (!YES) { console.error('  ⚠ Chưa chạy. Thêm --yes để xác nhận (trừ credit thật).'); process.exit(0); }
  if (WAIT0 > 0) console.error(`  … chờ ${WAIT0}s cho hết rate-limit, sau đó bắt đầu`);
  if (WAIT0 > 0) await sleep(WAIT0 * 1000);

  let done = 0, failed = 0, retries = 0;
  for (const [idx, it] of todo.entries()) {
    let doneOne = false;
    for (let attempt = 0; attempt <= MAX_RETRY && !doneOne; attempt++) {
      try {
        const res = await fetch(`${API}/${it.id}?confirm=true`, {
          headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 429 || data.code === 'RATE_LIMIT') {
          const wait = (attempt + 1) * 10 * 60;                 // 10 → 20 → 30 phút
          retries++;
          console.error(`\n  ⏸ RATE LIMIT (đã lấy ${done}/${todo.length}). Chờ ${wait / 60} phút rồi thử tiếp…`);
          save();
          await sleep(wait * 1000);
          continue;
        }
        if (!res.ok) { store[it.id] = { ...it, err: data.error || `HTTP ${res.status}`, code: data.code }; failed++; }
        else         { store[it.id] = { ...it, ...data, ok: true }; done++; doneOne = true; }
        save();                                                // lưu ngay từng tin
      } catch (e) {
        if (attempt === MAX_RETRY) { store[it.id] = { ...it, err: e.message }; failed++; save(); }
        else await sleep(5000);
      }
    }
    const pct = Math.round(((idx + 1) / todo.length) * 100);
    console.error(`  [${idx + 1}/${todo.length}] ${it.id}  ${store[it.id].ok ? '✓' : '✗'}  (${pct}%)`);
    await sleep(DELAY);
  }

  const total = Object.keys(store).length;
  console.error(`\n✔ Xong. Lấy được ${total} tin (lỗi ${failed}) → ${OUT}`);
  console.error(`✔ Đã dùng ~${(total - Object.values(store).filter(v => v.err).length) * COST} C-coin`);
})();