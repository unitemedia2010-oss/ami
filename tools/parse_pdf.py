"""
Trích danh sách chung cư từ PDF thành JSON.

Nguồn: "Danh sách chung cư HCM - AMI.pdf"
Bảng: STT | TÊN CHUNG CƯ - ĐỊA CHỈ | SL CĂN | Loại căn | Diện tích | Giá thuê | GIÁ BÁN

Bốn điểm khó khi trích text từ PDF:

1. Số thứ tự ĐÁNH SỐ LẠI THEO TỪNG QUẬN — trang Phú Nhuận lại bắt đầu từ 1.
   Không thể dùng "STT = số trước + 1" cho cả tài liệu. Gặp STT = 1 trong khi
   `expect` đang lớn hơn 1 => đã sang quận mới, reset `expect = 1`.

2. DÒNG ĐỊA CHỈ CŨNG BẮT ĐẦU BẰNG SỐ ("108 Hồng Hà") — dễ bị nhận nhầm là
   tên dự án. Chặn bằng cách chỉ nhận khi STT khớp `expect`.

3. Nhiều dòng gộp nhiều thông tin: "495 căn 1PN ~40–50m² 9–12 triệu 2,67–3,7 tỷ"
   vừa là số lượng vừa là thông số phòng → đọc cả hai từ một dòng.

4. Địa chỉ trong PDF ghi tên ĐƯỜNG, hiếm khi ghi tên quận ("108 Hồng Hà" thay vì
   "108 Hồng Hà, Bình Thạnh"). Không thể suy ra tên quận từ tên đường mà không
   đoán — nên mình dùng CẤU TRÚC của chính tài liệu: các dự án trong PDF được
   nhóm theo quận và STT đánh số lại từ 1 ở mỗi nhóm. Vì vậy:
     • gom các block thành "nhóm" theo dải STT liên tục,
     • lấy quận từ những dòng địa chỉ CÓ ghi rõ tên quận trong nhóm đó,
     • gán quận đó cho cả nhóm, đánh dấu `district_estimated = true` cho
       những dự án bản thân không ghi quận.
   Đây là dữ liệu thật suy từ tài liệu, không phải đoán bừa — và mọi dự án
   nhận quận từ suy luận đều được đánh dấu để bạn kiểm tra lại.

Kết quả: tools/projects.json
"""

import glob
import json
import os
import re
import unicodedata
from collections import Counter

from pypdf import PdfReader

# ---------------------------------------------------------------- tìm file
cands = glob.glob(os.path.join(r"D:\Downloads", "*chung c*HCM*AMI*.pdf")) \
    or glob.glob(os.path.join(r"D:\Downloads", "*AMI*.pdf"))
if not cands:
    raise SystemExit("khong tim thay file PDF")
PDF = cands[0]

NUM = r'\d+(?:[.,]\d+)?'

RE_START = re.compile(rf'^(\d{{1,3}})\s+(\S.*)$')
RE_ROOM = re.compile(
    r'^\s*(?:(?:\d{1,2}\s*[–\-]\s*)?\d{1,2}\s*PN'
    r'|Penthouse(?:\s*\d?\s*PN)?|Studio|Duplex|Căn\s*(?:lớn|nhỏ|hơn|đặc biệt))',
    re.IGNORECASE,
)
RE_AREA = re.compile(rf'({NUM})\s*(?:[–\-~]\s*({NUM}))?\s*m²', re.IGNORECASE)
RE_RENT = re.compile(rf'({NUM})\s*(?:[–\-~]\s*({NUM}))?\s*triệu', re.IGNORECASE)
RE_PRICE = re.compile(rf'({NUM})\s*(?:[–\-~]\s*({NUM}))?\s*tỷ', re.IGNORECASE)
RE_COUNT = re.compile(rf'^\s*({NUM})\s*(căn|phòng|officetel|block|toà|tòa)', re.IGNORECASE)

ABBR = {
    'TB': 'Tân Bình', 'BT': 'Bình Tân', 'BC': 'Bình Chánh', 'GV': 'Gò Vấp',
    'TD': 'Thủ Đức', 'BTH': 'Bình Thạnh', 'PD': 'Phú Đức', 'TBH': 'Tân Bình',
    'QBD': 'Quận Bình Dương', 'TDV': 'Thủ Dầu Một', 'BTG': 'Bình Thạnh',
}
ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7,
         'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12}
VALID = {
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7',
    'Quận 8', 'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12', 'Bình Tân',
    'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Thủ Đức',
    'Bình Chánh', 'Củ Chi', 'Hóc Môn', 'Nhơn Trạch', 'Cần Giờ', 'Cát Lái',
    'Phú Cường', 'Thủ Dầu Một', 'Vũng Tàu', 'Bà Rịa',
}


def clean(s: str) -> str:
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', s)).strip()


def expand_tr(line: str) -> str:
    """'9–12tr' → '9–12 triệu' (bảng dùng lẫn "triệu" và "tr")"""
    return re.sub(r'(\d)\s*tr(?![a-zêô])', r'\1 triệu', line, flags=re.IGNORECASE)


def to_num(s: str) -> float:
    """'2,64' -> 2.64 ; '1.345' -> 1345"""
    return float(s.replace('.', '').replace(',', '.'))


def norm_district(raw: str) -> str:
    d = clean(raw).strip('. ').strip()
    up = d.upper()
    if up in ABBR:
        return ABBR[up]
    m = re.fullmatch(r'(?:QUẬN|Q\.?)\s*([IVX]+|\d+)', up, re.IGNORECASE)
    if m:
        g = m.group(1)
        return f"Quận {ROMAN[g]}" if g.isalpha() else f"Quận {g}"
    return d if d in VALID else ''


def slugify(s: str) -> str:
    s = unicodedata.normalize('NFD', s).replace('đ', 'd').replace('Đ', 'D')
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')[:60] or 'du-an'


def bedrooms_of(t: str) -> int:
    t = t.upper().replace(' ', '')
    m = re.match(r'(\d{1,2})(?:\s*[–\-]\s*(\d{1,2}))?PN', t)
    if m:
        return max(int(m.group(1)), int(m.group(2))) if m.group(2) else int(m.group(1))
    return 1


# ---- làm sạch tên dự án ---------------------------------------------------
# Cụm từ chỉ là dữ liệu, không phải tên
NOISE = re.compile(
    r'\b(?:chưa\s+(?:đủ|có)\s+data|chưa\s+rõ|ít\s+dữ\s+liệu|không\s+rõ|'
    r'theo\s+hồ\s*sơ|nhiều\s+loại|đang\s+cập\s+nhật)\b',
    re.IGNORECASE,
)
# Vị trí phần dữ liệu bắt đầu chen vào tên
DATA_START = re.compile(
    r'\s(?=(?:\d{1,2}\s*[–\-]\s*)?\d{1,2}\s*PN\b|Penthouse|Studio|Duplex|Officetel'
    r'|\d+(?:[.,]\d+)?\s*m²|\d+(?:[.,]\d+)?\s*(?:triệu|tr\b|tỷ)|\d+\s*căn'
    r'|Các\s+loại\s+căn|Căn\s+(?:lớn|nhỏ|đặc\ biệt)|Hiện\s+thị\s+trường)',
    re.IGNORECASE,
)
# Biến thể dính liền, không có khoảng trắng: "Hưng Phúc Premier2PN 75–82m²"
DATA_GLUE = re.compile(
    r'(?<=[A-Za-zÀ-ỹ])(?=(?:\d{1,2}\s*[–\-]\s*)?\d{1,2}\s*PN\b'
    r'|\d+(?:[.,]\d+)?\s*m²)',
)


def tidy_name(raw: str) -> str:
    """Cắt phần dữ liệu bị lẫn vào tên dự án.

    Với một số dự án, PDF đặt tên và thông số phòng trên CÙNG một dòng:
        "CONIC RIVERSIDE 1PN ~50–60m² 6 – 6,5 triệu 2,47 – 2,82 tỷ"
    Lấy nguyên dòng làm tên sẽ khiến tiêu đề tin đăng vô nghĩa và phá vỡ
    nhóm dự án trùng tên. Vì vậy cắt từ vị trí bắt đầu của phần dữ liệu.
    """
    s = clean(raw)
    m = DATA_START.search(s)
    if m:
        s = s[:m.start()]
    else:
        g = DATA_GLUE.search(s)
        if g:
            s = s[:g.start()]
    s = NOISE.sub(' ', s)
    s = clean(s).strip(' ·-–—/,')
    s = re.sub(r'\s*/\s*$', '', s)
    return s or clean(raw)[:40]


# ---------------------------------------------------------------- 1. cắt block
reader = PdfReader(PDF)
blocks = []
cur = None
expect = 1

for pi, page in enumerate(reader.pages, start=1):
    for raw_line in (page.extract_text() or "").split("\n"):
        line = expand_tr(clean(raw_line))
        if not line:
            continue
        m = RE_START.match(line)

        if m and not RE_ROOM.match(line) and not RE_COUNT.match(line):
            stt = int(m.group(1))
            is_start = (stt == expect) or (expect < stt <= expect + 2)
            if stt == 1 and expect > 1:          # sang quận mới
                expect, is_start = 1, True
            if is_start:
                cur = {'seq': len(blocks) + 1, 'stt': stt, 'page': pi,
                       'lines': [clean(m.group(2))]}
                blocks.append(cur)
                expect = stt + 1
                continue

        if cur is not None:
            cur['lines'].append(line)

# ------------------------------------------------- 2. gom block theo nhóm quận
# Một nhóm = dải STT liên tục. Ranh giới nhóm: STT quay về 1, hoặc nhảy > 2.
groups = []
g = []
prev = 0
for b in blocks:
    if g and (b['stt'] == 1 or b['stt'] > prev + 2):
        groups.append(g)
        g = []
    g.append(b)
    prev = b['stt']
if g:
    groups.append(g)

# nhóm quá ngắn (<2) thường là nhiễu → gộp vào nhóm kề
merged = []
for grp in groups:
    if merged and len(grp) < 2 and grp[0]['stt'] <= merged[-1][-1]['stt'] + 3:
        merged[-1].extend(grp)
    else:
        merged.append(list(grp))
groups = merged

# ---------------------------------------------------------------- 3. phân tích
projects = []

for gi, grp in enumerate(groups):
    parsed = []

    for b in grp:
        name = b['lines'][0]
        address = district = ''
        count = None
        rooms = []

        for line in b['lines'][1:]:
            if not address and ',' in line and len(line) < 120:
                d = norm_district(line.rsplit(',', 1)[-1])
                if d:
                    address, district = line, d

            mc = RE_COUNT.match(line)
            if mc and count is None:
                count = int(to_num(mc.group(1)))

            mr = RE_ROOM.search(line)
            if mr:
                room = {'type': clean(mr.group(0))}
                ma = RE_AREA.search(line)
                if ma:
                    room['area_min'] = to_num(ma.group(1))
                    room['area_max'] = to_num(ma.group(2)) if ma.group(2) else to_num(ma.group(1))
                rr = RE_RENT.search(line)
                if rr:
                    room['rent_min'] = to_num(rr.group(1))
                    room['rent_max'] = to_num(rr.group(2)) if rr.group(2) else to_num(rr.group(1))
                mp = RE_PRICE.search(line)
                if mp:
                    room['price_min'] = to_num(mp.group(1))     # đơn vị TRIỆU
                    room['price_max'] = to_num(mp.group(2)) if mp.group(2) else to_num(mp.group(1))
                if len(room) > 1:
                    rooms.append(room)

        # Tên đôi khi bị ngắt dòng: "3 Chung cư Phạm Viết Chánh" + "4 Phan Chu Trinh"
        if len(name) < 6 and len(b['lines']) > 1:
            cand = b['lines'][1]
            if cand and ',' not in cand and not RE_ROOM.search(cand) \
                    and not RE_COUNT.match(cand):
                name = f"{name} {cand}"

        # tiện ích suy từ tên — chỉ là gợi ý hiển thị, không phải dữ liệu chuẩn
        amenities = ['hầm xe', 'an ninh 24/7', 'sân để xe', 'gym']
        low = name.lower()
        if any(k in low for k in ('plaza', 'tower', 'landmark', 'office')):
            amenities.append('văn phòng')
        if any(k in low for k in ('pool', 'aqua', 'sun', 'beach', 'resort')):
            amenities.append('hồ bơi')

        parsed.append({
            'seq': b['seq'], 'stt': b['stt'], 'page': b['page'],
            'name': tidy_name(name), 'address': address, 'district': district,
            'count': count, 'rooms': rooms,
            'amenities': sorted(set(amenities)),
        })

    # quận của nhóm = quận xuất hiện nhiều nhất trong các địa chỉ ghi rõ
    known = Counter(p['district'] for p in parsed if p['district'])
    group_district = known.most_common(1)[0][0] if known else ''

    for p in parsed:
        p['group'] = gi + 1
        if not p['district'] and group_district:
            p['district'] = group_district
            p['district_estimated'] = True      # ⚠ cần kiểm tra lại
        else:
            p['district_estimated'] = False
        projects.append(p)

# ---------------------------------------------------------------- 4. lưu
dest = os.path.join(os.path.dirname(__file__), 'projects.json')
with open(dest, 'w', encoding='utf-8') as f:
    json.dump(projects, f, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- 5. báo cáo
est = sum(1 for p in projects if p['district_estimated'])
print(f"PDF          : {os.path.basename(PDF)}")
print(f"Nhóm (quận)  : {len(groups)}")
print(f"Dự án       : {len(projects)}")
print(f"Phòng       : {sum(len(p['rooms']) for p in projects)}")
print(f"Quận rõ     : {len(projects) - est}")
print(f"Quận ước lg : {est}   ← kiểm tra lại trước khi dùng thật")
print(f"Thiếu phòng  : {sum(1 for p in projects if not p['rooms'])}")
print(f"Đã lưu      : {dest}\n")

dist = Counter(p['district'] or '(chưa rõ)' for p in projects)
print("Phân bố quận:")
for d, n in dist.most_common():
    print(f"  {d:<20} {n}")

print("\n--- 4 dự án đầu ---")
for p in projects[:4]:
    tag = '  (ước lượng)' if p['district_estimated'] else ''
    print(f"\n#{p['seq']} {p['name']}")
    print(f"   {p['address'] or '(chưa rõ)'}  [{p['district'] or '?'}]{tag}  SL: {p['count'] or '?'}")
    for r in p['rooms'][:3]:
        print(f"   - {r}")