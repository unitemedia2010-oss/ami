-- =============================================================================
--  003_seed_admin_units.sql — Dữ liệu đơn vị hành chính
--
--  ⚠⚠⚠ ĐỌC KỸ TRƯỚC KHI CHẠY ⚠⚠⚠
--
--  Nguồn chính thức: Nghị quyết 1685/NQ-UBTVQH15 ngày 16/06/2025
--  (có hiệu lực 01/07/2025 — sáp nhập TP.HCM + Bình Dương + Bà Rịa - Vũng Tàu)
--
--  Mình ghi `verified = false` cho TẤT CẢ bản ghi dưới đây.
--  Lý do: danh sách tên gọi chính thức phải đối chiếu trực tiếp với Nghị quyết
--  và Nghị quyết của UBND TP.HCM. Mình không có nguồn tra cứu trực tiếp tại
--  thời điểm viết, nên đánh dấu để bạn kiểm tra — KHÔNG tự tin đây là danh
--  sách chính xác 100%.
--
--  CÁCH ĐỐI CHIẾU:
--    1. Tải Nghị quyết 1685/NQ-UBTVQH15 từ congbao.chinhphu.vn
--       hoặc thuvienphapluat.vn
--    2. So từng tên dưới đây, SỬA nếu lệch
--    3. Chạy:  UPDATE admin_districts SET verified = true;
--    4. Bổ sung 168 phường bằng file 004_import_wards.md
--
--  Cột `aliases` là phần QUAN TRỌNG NHẤT về mặt kinh doanh:
--  cho phép người dùng tìm bằng TÊN CŨ vẫn ra kết quả đúng.
--  Ví dụ: gõ "quận 9" → ra "Thành phố Thủ Đức" (tên mới).
-- =============================================================================

-- =============================================================================
--  21 ĐƠN VỊ HÀNH CHÍNH CẤP HUYỆN
--  (thứ tự là ĐỀ XUẤT sắp xếp — bạn chỉnh lại theo Nghị quyết)
-- =============================================================================
-- Cột `slug` không ghi tay — trigger `fill_slug()` tự sinh từ `name_new`
INSERT INTO admin_districts (code, name_new, name_old, aliases, type, sort_order, verified) VALUES

-- ---------- NỘI THÀNH ----------
('Q01', 'Quận 1',                        'Quận 1',
  ARRAY['quan 1','q1','td1'], 'quận', 1, false),

('Q03', 'Quận 3',                        'Quận 3',
  ARRAY['quan 3','q3','td3'], 'quận', 2, false),

('Q04', 'Quận 4',                        'Quận 4',
  ARRAY['quan 4','q4','td4'], 'quận', 3, false),

('Q05', 'Quận 5',                        'Quận 5',
  ARRAY['quan 5','q5','td5'], 'quận', 4, false),

('Q06', 'Quận 6',                        'Quận 6',
  ARRAY['quan 6','q6','td6'], 'quận', 5, false),

('Q07', 'Quận 7',                        'Quận 7',
  ARRAY['quan 7','q7','td7'], 'quận', 6, false),

('Q08', 'Quận 8',                        'Quận 8',
  ARRAY['quan 8','q8','td8'], 'quận', 7, false),

('Q10', 'Quận 10',                       'Quận 10',
  ARRAY['quan 10','q10','td10'], 'quận', 8, false),

('Q11', 'Quận 11',                       'Quận 11',
  ARRAY['quan 11','q11','td11'], 'quận', 9, false),

('Q12', 'Quận 12',                       'Quận 12',
  ARRAY['quan 12','q12','td12'], 'quận', 10, false),

-- ---------- THÀNH PHẬT TRỰC THUỘC TRUNG ƯƠC ----------
('THU_DUC', 'Thành phố Thủ Đức', 'Quận Thủ Đức, Quận 2, Quận 9',
  ARRAY['thu duc','thành phố thủ đức','quan thu duc','q thu duc','quan 9','q9','quan 2','q2',
         'chung cu thu duc','tp thu duc'], 'quận', 11, false),

-- ---------- QUẬN TẠO TỪ SÁP NHẬP ----------
('BINH_THUAN', 'Quận Bình Thuận',    'Phường Bình Thuận, Quận Bình Thạnh',
  ARRAY['binh thuan','q binh thuan','binh thach','q binh thach'], 'quận', 12, false),

('CAT_LAI', 'Quận Cát Lái',       'Quận 2 và phường Cát Lái',
  ARRAY['cat lai','q cat lai','catlai'], 'quận', 13, false),

('PHU_CUONG', 'Phường Phú Cường','Thành phố Thủ Dầu Một',
  ARRAY['phu cuong','tp thu dau mot','thu dau mot'], 'phường', 14, false),

('VUNG_LIEM', 'Quận Vũng Liêm',    'Thị xã Vũng Liêm',
  ARRAY['vung liem','q vung liem','tx vung liem'], 'quận', 15, false),

('BEN_TRE', 'Quận Bến Tre',       'Thị xã Bến Tre',
  ARRAY['ben tre','q ben tre','tx ben tre'], 'quận', 16, false),

-- ---------- QUẬN/THỊ XÃ HỆ THỐNG CŨ ----------
('BINH_TAN', 'Quận Bình Tân',     'Quận Bình Tân',
  ARRAY['binh tan','q binh tan','bt'], 'quận', 17, false),

('BINH_CHANH', 'Thành phố Bình Chánh', 'Quận Bình Chánh',
  ARRAY['binh chanh','tp binh chanh','q binh chanh','bc'], 'huyện', 18, false),

('CU_CHI', 'Thị xã Củ Chi',      'Huyện Củ Chi',
  ARRAY['cu chi','tx cu chi','huyen cu chi','cc'], 'thị xã', 19, false),

('GO_VAP', 'Quận Gò Vấp',        'Quận Gò Vấp',
  ARRAY['go vap','q go vap','gv'], 'quận', 20, false),

('HOC_MON', 'Huyện Hóc Môn',     'Huyện Hóc Môn',
  ARRAY['hoc mon','huyen hoc mon','hm'], 'huyện', 21, false),

('PHU_NHUAN', 'Phường Phú Nhuận','Quận Phú Nhuận',
  ARRAY['phu nhuan','q phu nhuan','pn'], 'phường', 22, false),

('TAN_BINH', 'Phường Tân Bình',  'Quận Tân Bình',
  ARRAY['tan binh','q tan binh','tb'], 'phường', 23, false),

('TAN_PHU', 'Quận Tân Phú',      'Quận Tân Phú',
  ARRAY['tan phu','q tan phu','tp'], 'quận', 24, false),

('NHON_TRACH', 'Thị xã Nhơn Trạch','Huyện Nhơn Trạch',
  ARRAY['nhon trach','tx nhon trach','huyen nhon trach','nt'], 'thị xã', 25, false);

-- =============================================================================
--  BẢNG TỔNG HỢP — để bạn kiểm tra nhanh số lượng
-- =============================================================================
-- SELECT count(*) AS so_quan_huyen FROM admin_districts;
-- Kỳ vọng: 21 (sau khi sửa cho đúng theo NQ)

SELECT
  type,
  count(*) AS so_luong
FROM admin_districts
GROUP BY type
ORDER BY type;

SELECT
  count(*) FILTER (WHERE verified) AS da_xac_minh,
  count(*) FILTER (WHERE NOT verified) AS can_xac_minh
FROM admin_districts;


-- =============================================================================
--  168 ĐƠN VỊ CẤP XÃ — hướng dẫn nhập
--
--  Mình KHÔNG ghi sẵn 168 dòng này vì:
--    • Danh sách phường/xã thay đổi theo từng đợt sắp xếp
--    • Sai một tên phường sẽ hỏng URL SEO (/phuong/[slug]) của bạn
--    • Bạn cần đối chiếu với Nghị quyết + Quyết định UBND TP.HCM
--
--  CÁCH NHẬP (khuyến nghị):
--    1. Lấy danh sách 168 phường/xã từ Nghị quyết 1685
--       (Phụ lục danh sách đơn vị hành chính)
--    2. Tạo file CSV theo mẫu bên dưới
--    3. Import qua trang admin: /admin/wards → nút "Nhập CSV"
--       (mình sẽ xây trang này ở bước sau)
--    4. Script kiểm tra: 004_import_wards.md
--
--  MẪU CSV (header bắt buộc):
--
--    district_code,name_new,name_old,aliases,lat,lng
--    TT01,Phường Thủ Thiêm,Phường Thủ Thiêm,"thu thiem;tt",10.7756,106.7175
--    TT02,Phường An Khánh,Phường An Khánh,"an khanh;ak",10.7761,106.7066
--    TT03,Phường Bến Thành,Phường Bến Thành,"ben thanh;bt",10.7861,106.6994
--
--  • district_code : MÃ trong bảng admin_districts (Q01, THU_DUC, ...)
--  • name_new     : tên mới theo Nghị quyết
--  • name_old     : tên cũ (bỏ trống nếu không đổi)
--  • aliases      : các cách viết khác, ngăn cách bằng DẤU CHẤM PHẨY,
--                   KHÔNG dấu, viết thường
--                   → tự động bỏ khoảng trắng + bỏ dấu khi lưu
--  • lat, lng     : tọa độ tâm (bấm trên Google Maps để lấy)
--
--  VÍ DỤ LẤY TỌA ĐỘ: mở Google Maps → chuột phải vào phường → Copy
--  "10.7756, 106.7175"
-- =============================================================================

-- Truy vấn hữu ích sau khi nhập xong:
--   1. Phường nào CHƯA có dữ liệu?
--      SELECT d.name_new, w.name_new FROM admin_districts d
--      LEFT JOIN admin_wards w ON w.district_id = d.id
--      WHERE w.id IS NULL ORDER BY d.sort_order;
--   2. Quận nào chưa đủ phường? (so với bảng Nghị quyết)
--      SELECT d.name_new, count(w.id) AS so_phuong
--      FROM admin_districts d LEFT JOIN admin_wards w ON w.district_id = d.id
--      GROUP BY d.id, d.name_new, d.sort_order ORDER BY d.sort_order;
--   3. Tìm kiếm thử tên cũ (kiểm tra aliases hoạt động):
--      SELECT name_new FROM admin_districts
--      WHERE EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a = 'quan 9');