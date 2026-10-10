#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Tạo file .xlsx từ all-merged.json (27.987 tin) — gọn gàng để dùng trong Excel.

Sheet:
  1. Tất cả        – toàn bộ tin, có bộ lọc + freeze dòng tiêu đề
  2. Cho thuê      – lọc riêng
  3. Bán           – lọc riêng
  4. Thống kê      – tổng hợp theo quận / loại nhà / khoảng giá

Cột được chuẩn hoá thêm:
  - loaiHinhNhaChuan : gộp ~100 biến thể chữ nghĩa về 8 nhóm
  - hinhThucChuan    : 'Cho Thuê' / 'Bán'
  - donViGia         : 'triệu/tháng' hoặc 'tỷ'
"""
import json, os, sys, re
from collections import Counter, defaultdict

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

SRC = sys.argv[1] if len(sys.argv) > 1 else "all-merged.json"
DST = sys.argv[2] if len(sys.argv) > 2 else "BDS-khonhachinhchu.xlsx"

# ---------------------------------------------------------------- chuẩn hoá
GROUP = {
    "chung cư": ["chung cư", "chung cu", "căn hộ", "can ho", "penthouse", "chung cư cũ",
                 "căn hộ chung cư", "mbkd chung cư", "shop house chung cư", "the beverly solari"],
    "căn hộ / chung cư": ["chung cư", "căn hộ", "penthouse", "the beverly solari"],
    "nhà phố / nhà hẻm": ["nhà hẻm", "nha hem", "nhà mặt tiền", "nha mat tien", "nhà mặt phố",
                          "nhà phố", "nha pho", "nhà phố liền kề", "nhà phố thô", "nhà cấp 4",
                          "nhà", "biệt thự", "villa", "nhà nguyên căn"],
    "đất nền": ["đất", "dat", "đất nền", "đất nền trống", "đất trống", "đất thổ cư",
                "đất nông nghiệp", "thửa đất", "lô đất", "nền đất", "đất liền kề",
                "khu đất nền", "đất mặt tiền", "đất khu dân cư", "lô đất thổ cư", "đất nc"],
    "mặt bằng kinh doanh": ["mặt bằng", "mbkd", "shop", "kiosk", "kiot", "cửa hàng"],
    "văn phòng": ["văn phòng", "văn phong", "tòa nhà", "tòa nhà chdv"],
    "kho / xưởng": ["kho", "xưởng", "nhà kho", "kho bãi", "nhà xưởng"],
    "cư xá / khác": ["cư xá", "tập thể", "khác", "trường mầm non", "biệt thự liền kề",
                     "biệt thự mini", "biệt thự mặt tiền", "khu dân cư", "đất trống + kho xưởng"],
}
# nhóm theo thứ tự ưu tiên; "căn hộ / chung cư" chỉ dùng khi không khớp nhóm nào
PRIORITY = ["mặt bằng kinh doanh", "kho / xưởng", "văn phòng", "đất nền",
            "chung cư", "nhà phố / nhà hẻm", "căn hộ / chung cư", "cư xá / khác"]


def chuan_loai(s):
    t = (s or "").strip().lower()
    if not t:
        return "Chưa phân loại"
    for g in PRIORITY:
        if any(k in t for k in GROUP[g]):
            return g
    return s.strip()


def chuan_hinhthuc(s):
    t = (s or "").strip().lower()
    if "thuê" in t or t == "cho thue":
        return "Cho Thuê"
    if "bán" in t or t == "ban":
        return "Bán"
    return s.strip() or "Khác"


def lam_clean_chu(s):
    if s is None:
        return ""
    return re.sub(r"\s+", " ", str(s)).strip()


# ---------------------------------------------------------------- đọc dữ liệu
with open(SRC, "r", encoding="utf-8") as f:
    rows = json.load(f)

for r in rows:
    r["loaiChuan"] = chuan_loai(r.get("loaiHinhNha"))
    r["hinhThucChuan"] = chuan_hinhthuc(r.get("hinhThuc"))
    r["loaiGoc"] = lam_clean_chu(r.get("loaiHinhNha"))
    r["moTa"] = lam_clean_chu(r.get("moTa"))
    r["tieuDe"] = lam_clean_chu(r.get("tieuDe"))
    r["duAn"] = lam_clean_chu(r.get("duAn"))
    r["duong"] = lam_clean_chu(r.get("duong"))
    r["quan"] = lam_clean_chu(r.get("quan"))
    r["phuong"] = lam_clean_chu(r.get("phuong"))
    r["donViGia"] = "triệu/tháng" if r["hinhThucChuan"] == "Cho Thuê" else "tỷ"
    if r["hinhThucChuan"] == "Cho Thuê":
        r["giaHienThi"] = f"{r.get('giaTrieu', 0):,.0f} triệu/tháng".replace(",", ".")
    else:
        r["giaHienThi"] = f"{r.get('giaTy', 0):,.2f} tỷ".replace(",", ".").rstrip("0").rstrip(".") + " tỷ"

rows.sort(key=lambda r: str(r.get("ngayDangISO") or ""), reverse=True)

# ---------------------------------------------------------------- định dạng
HEAD = ["Mã tin", "Ngày đăng", "Hình thức", "Loại nhà (gốc)", "Loại (đã chuẩn hoá)",
        "Giá hiển thị", "Giá (triệu)", "Giá (tỷ)", "Đơn vị giá",
        "Quận/Huyện", "Phường/Xã", "Đường", "Dự án",
        "Số phòng ngủ", "Số tầng", "Mô tả", "Ảnh", "Link", "Nguồn"]
WIDTH = [13, 18, 11, 20, 20, 16, 12, 11, 13, 18, 20, 26, 28, 12, 9, 60, 30, 52, 12]

H_FILL = PatternFill("solid", fgColor="0A2340")
H_FONT = Font(color="FFFFFF", bold=True, size=11)
THIN = Side(style="thin", color="D9D9D9")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def them_sheet(wb, tieu_de, data, bang):
    ws = wb.create_sheet(tieu_de)
    ws.append(HEAD)
    for c in range(1, len(HEAD) + 1):
        cell = ws.cell(row=1, column=c)
        cell.fill, cell.font, cell.border = H_FILL, H_FONT, BORDER
        cell.alignment = Alignment(vertical="center", horizontal="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(c)].width = WIDTH[c - 1]
    ws.row_dimensions[1].height = 30

    for r in data:
        ws.append([r.get("id", ""), (r.get("ngayDangISO") or "")[:10], r["hinhThucChuan"],
                   r["loaiGoc"], r["loaiChuan"], r["giaHienThi"], r.get("giaTrieu", 0),
                   r.get("giaTy", 0), r["donViGia"], r["quan"], r["phuong"], r["duong"],
                   r["duAn"], r.get("soPhongNgu", ""), r.get("soTang", ""), r["moTa"],
                   r.get("anh", ""), r.get("link", ""), r.get("nguon", "")])

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(HEAD))}{max(ws.max_row, 1)}"

    # link bấm được
    for row in ws.iter_rows(min_row=2, min_col=18, max_col=18):
        for cell in row:
            if cell.value:
                cell.hyperlink = cell.value
                cell.font = Font(color="0563C1", underline="single")

    # định dạng số
    for row in ws.iter_rows(min_row=2, min_col=7, max_col=8):
        row[0].number_format = "#,##0.00" if row[0].column == 8 else "#,##0"
    return ws


wb = Workbook()
wb.remove(wb.active)

them_sheet(wb, "Tất cả", rows, "TatCa")
them_sheet(wb, "Cho thuê", [r for r in rows if r["hinhThucChuan"] == "Cho Thuê"], "ChoThue")
them_sheet(wb, "Bán", [r for r in rows if r["hinhThucChuan"] == "Bán"], "Ban")

# ---------------------------------------------------------------- thống kê
ws = wb.create_sheet("Thống kê")


def ghi_tieu_de(ws, row, text, ncol=6):
    ws.cell(row=row, column=1, value=text).font = Font(bold=True, size=12, color="0A2340")
    return row + 1


def ghi_bang(ws, row, tieu_de, counter, tong=0, tong_tien=0.0, donvi="tỷ"):
    ws.cell(row=row, column=1, value=tieu_de).font = Font(bold=True, color="FFFFFF")
    ws.cell(row=row, column=1).fill = H_FILL
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=4)
    row += 1
    for i, h in enumerate(["Nhóm", "Số tin", "Tỉ lệ", f"Giá TB ({donvi})"], start=1):
        c = ws.cell(row=row, column=i, value=h)
        c.font = Font(bold=True)
        c.fill = PatternFill("solid", fgColor="EEF3F8")
        c.border = BORDER
    row += 1
    for name, n in (counter.most_common() if hasattr(counter, "most_common") else counter):
        gia_tb = tong_tien / n if n else 0
        ws.cell(row=row, column=1, value=name).border = BORDER
        c = ws.cell(row=row, column=2, value=n); c.border = BORDER; c.number_format = "#,##0"
        c = ws.cell(row=row, column=3, value=n / tong if tong else 0)
        c.border = BORDER; c.number_format = "0.0%"
        c = ws.cell(row=row, column=4, value=round(gia_tb, 2))
        c.border = BORDER; c.number_format = "#,##0.00"
        row += 1
    return row + 1


r = 1
ws.cell(row=r, column=1, value="TỔNG HỢP DỮ LIỆU BẤT ĐỘNG SẢN — khonhachinhchu.net").font = \
    Font(bold=True, size=15, color="0A2340")
r += 1
ws.cell(row=r, column=1, value=f"Tạo lúc: {os.popen('date /t').read().strip()}")
r += 1
ws.cell(row=r, column=1, value=f"Tổng số tin: {len(rows):,}").font = Font(bold=True)
r += 2

for i, w in enumerate([30, 12, 12, 18, 14, 14], start=1):
    ws.column_dimensions[get_column_letter(i)].width = w

ban = [x for x in rows if x["hinhThucChuan"] == "Bán"]
thue = [x for x in rows if x["hinhThucChuan"] == "Cho Thuê"]

r = ghi_tieu_de(ws, r, "① Theo hình thức giao dịch")
r = ghi_bang(ws, r, "Tất cả", Counter(x["hinhThucChuan"] for x in rows), len(rows),
             sum(x.get("giaTy", 0) for x in rows))
r = ghi_bang(ws, r, "Bán — theo quận/huyện", Counter(x["quan"] or "(trống)" for x in ban), len(ban),
             sum(x.get("giaTy", 0) for x in ban))
r = ghi_bang(ws, r, "Cho thuê — theo quận/huyện", Counter(x["quan"] or "(trống)" for x in thue), len(thue),
             sum(x.get("giaTrieu", 0) for x in thue), "triệu/tháng")
r = ghi_bang(ws, r, "Loại nhà (đã chuẩn hoá)", Counter(x["loaiChuan"] for x in rows), len(rows),
             sum(x.get("giaTy", 0) for x in rows))
r = ghi_bang(ws, r, "Top 20 dự án", Counter(x["duAn"] for x in rows if x["duAn"]).most_common(20),
             sum(1 for x in rows if x["duAn"]),
             sum(x.get("giaTy", 0) for x in rows if x["duAn"]))

# băng giá
ws.cell(row=r, column=1, value="Phân bố theo mức giá").font = Font(bold=True, size=12, color="0A2340")
r += 1
for i, h in enumerate(["Mức giá", "Số tin", "Chiếm %"], start=1):
    c = ws.cell(row=r, column=i, value=h); c.font = Font(bold=True)
    c.fill = PatternFill("solid", fgColor="EEF3F8"); c.border = BORDER
r += 1
n = len(thue)
buckets = [("Dưới 10 triệu/tháng", lambda v: v < 10), ("10 – 20 triệu/tháng", lambda v: 10 <= v < 20),
           ("20 – 50 triệu/tháng", lambda v: 20 <= v < 50), ("50 – 100 triệu/tháng", lambda v: 50 <= v < 100),
           ("Trên 100 triệu/tháng", lambda v: v >= 100)]
for name, fn in buckets:
    c = sum(1 for x in thue if fn(x.get("giaTrieu", 0)))
    ws.cell(row=r, column=1, value=name).border = BORDER
    ws.cell(row=r, column=2, value=c).border = BORDER
    ws.cell(row=r, column=3, value=c / n if n else 0).border = BORDER
    ws.cell(row=r, column=3).number_format = "0.0%"
    r += 1

ws.cell(row=r + 1, column=1, value="Bán — theo mức giá").font = Font(bold=True, size=12, color="0A2340")
r += 2
for i, h in enumerate(["Mức giá", "Số tin", "Chiếm %"], start=1):
    c = ws.cell(row=r, column=i, value=h); c.font = Font(bold=True)
    c.fill = PatternFill("solid", fgColor="EEF3F8"); c.border = BORDER
r += 1
nb = len(ban)
for name, fn in [("Dưới 5 tỷ", lambda v: v < 5), ("5 – 10 tỷ", lambda v: 5 <= v < 10),
                 ("10 – 20 tỷ", lambda v: 10 <= v < 20), ("20 – 50 tỷ", lambda v: 20 <= v < 50),
                 ("Trên 50 tỷ", lambda v: v >= 50)]:
    c = sum(1 for x in ban if fn(x.get("giaTy", 0)))
    ws.cell(row=r, column=1, value=name).border = BORDER
    ws.cell(row=r, column=2, value=c).border = BORDER
    ws.cell(row=r, column=3, value=c / nb if nb else 0).border = BORDER
    ws.cell(row=r, column=3).number_format = "0.0%"
    r += 1

# độ phủ dữ liệu
r += 1
ws.cell(row=r, column=1, value="Độ phủ & chất lượng dữ liệu").font = Font(bold=True, size=12, color="0A2340")
r += 1
checks = [
    ("Có ảnh", sum(1 for x in rows if x.get("anh"))),
    ("Có mô tả", sum(1 for x in rows if x.get("moTa"))),
    ("Có dự án", sum(1 for x in rows if x.get("duAn"))),
    ("Có số phòng ngủ", sum(1 for x in rows if x.get("soPhongNgu") not in ("", None))),
    ("Có số tầng", sum(1 for x in rows if x.get("soTang") not in ("", None))),
    ("Thiếu ảnh", sum(1 for x in rows if not x.get("anh"))),
    ("Thiếu mô tả", sum(1 for x in rows if not x.get("moTa"))),
]
for name, c in checks:
    ws.cell(row=r, column=1, value=name).border = BORDER
    cell = ws.cell(row=r, column=2, value=c); cell.border = BORDER; cell.number_format = "#,##0"
    ws.cell(row=r, column=3, value=c / len(rows) if rows else 0).border = BORDER
    ws.cell(row=r, column=3).number_format = "0.0%"
    r += 1

wb.save(DST)
print(f"✔ Đã tạo {DST}")
print(f"  {len(rows):,} tin · sheet: Tất cả / Cho thuê / Bán / Thống kê")
print(f"  Kích thước: {os.path.getsize(DST)/1024/1024:.1f} MB")