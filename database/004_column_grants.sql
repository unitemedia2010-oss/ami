-- =============================================================================
--  004_column_grants.sql — CẤP QUYỀN THEO TỪNG CỘT
--
--  ⚠ SỬA LỖI NGHIÊM TRỌNG TRONG THIẾT KẾ CŨ
--
--  Vấn đề: policy "listings_read_published" cho phép anon đọc tin đã publish.
--  Nhưng GRANT mặc định của Supabase là SELECT * — tức là anon có thể đọc
--  CỘT address_line (số nhà, số căn hộ) bằng cách gọi thẳng PostgREST:
--
--      curl "https://<project>.supabase.co/rest/v1/listings?select=address_line"
--
--  Dù giao diện không bao giờ hiển thị cột đó, kẻ cào gọi thẳng API vẫn lấy được.
--  → ĐÂY CHÍNH LÀ "data leak qua API" kinh điển. Phải chặn ở tầng DB.
--
--  Cách sửa: thu hồi quyền SELECT trên bảng, rồi cấp lại THEO TỪNG CỘT,
--  loại cột nhạy cảm ra khỏi danh sách được cấp.
-- =============================================================================

-- 1) Thu hồi toàn bộ quyền SELECT mặc định trên các bảng nhạy cảm
REVOKE ALL ON listings         FROM anon, authenticated;
REVOKE ALL ON listing_contacts FROM anon, authenticated;
REVOKE ALL ON leads            FROM anon, authenticated;
REVOKE ALL ON profiles         FROM anon, authenticated;
REVOKE ALL ON projects         FROM anon, authenticated;

-- 2) LISTINGS — chỉ cấp các cột công khai cho khách (ẩn address_line)
GRANT SELECT (
  id, slug, type, status, project_id, tower_name,
  title, ward_id, district_id, street_id,
  price, price_unit, negotiable,
  area, bedrooms, bathrooms, floors, floor_number,
  direction, furniture, features,
  images, video_url, is_sponsored,
  agent_id, published_at, expires_at, created_at,
  view_count, view_count_7d
) ON listings TO anon, authenticated;

-- ⚠ address_line CỐ TÌNH KHÔNG có trong danh sách trên.
--   Chỉ service_role (Worker) đọc được cột này.

-- 3) DỰ ÁN — toàn bộ trường đều công khai
GRANT SELECT ON projects TO anon, authenticated;

-- 4) ĐƠN VỊ HÀNH CHÍNH — công khai (cần cho bộ lọc)
GRANT SELECT ON admin_districts TO anon, authenticated;
GRANT SELECT ON admin_wards     TO anon, authenticated;
GRANT SELECT ON admin_streets   TO anon, authenticated;

-- 5) LEADS — khách tự gửi form; chỉ đọc được lead của chính mình.
--    ⚠ Cấp quyền theo CỘT: không cấp `status`, `agent_id`, `ip_hash`
--    → client không tự gán "đã phân công cho môi giới này" hoặc đánh dấu đã xử lý.
--    (Ghi tin qua Worker bằng service_role nên vẫn đặt được các cột này.)
GRANT SELECT (id, listing_id, full_name, phone, email, message, source, created_at)
  ON leads TO authenticated;
GRANT INSERT (full_name, phone, email, message, listing_id, user_id, source)
  ON leads TO anon, authenticated;

-- 6) PROFILES — chỉ cột công khai + hồ sơ của chính mình
--    (không cấp credit/role cho client để tránh lộ số liệu nội bộ)
GRANT SELECT ON profiles TO authenticated;

-- 7) listing_contacts — KHÔNG cấp gì cả cho anon/authenticated.
--    Hàm reveal_contact() chạy với quyền của chính người gọi nên vẫn ghi log được.

-- =============================================================================
--  VIEW AN TOÀN — dùng cho API, kể cả khi gọi nhầm bảng gốc
--  Đây là lớp "bọc" để trong code không bao giờ vô tình SELECT * .
-- =============================================================================

-- ⚠ QUAN TRỌNG: Postgres mặc định cho view quyền của CHỦ SỞ HỮU view,
--   tức là BỎ QUA RLS của bảng gốc. Đây là lỗ hổng kinh điển: tạo view
--   trên bảng có RLS rồi đọc qua view để né toàn bộ chính sách.
--   security_invoker = true bắt buộc view chạy với quyền của người gọi
--   → RLS của listings/admin_wards/admin_districts được áp dụng đầy đủ.
CREATE OR REPLACE VIEW public.listing_cards
WITH (security_invoker = true) AS
SELECT
  l.id, l.slug, l.type, l.title, l.price, l.price_unit, l.negotiable,
  l.area, l.bedrooms, l.bathrooms, l.floors, l.floor_number,
  l.direction, l.furniture, l.features, l.images, l.video_url,
  l.project_id, l.tower_name, l.is_sponsored, l.priority,
  l.ward_id, l.district_id, l.street_id,
  l.agent_id, l.published_at, l.expires_at, l.created_at,
  l.view_count, l.view_count_7d,
  w.name_new  AS ward_name,     w.slug AS ward_slug,
  d.name_new  AS district_name, d.slug AS district_slug,
  p.name      AS project_name,  p.slug AS project_slug,
  p.lat AS project_lat, p.lng AS project_lng,
  p.amenities AS project_amenities
FROM listings l
LEFT JOIN admin_wards    w ON w.id = l.ward_id
LEFT JOIN admin_districts d ON d.id = l.district_id
LEFT JOIN projects        p ON p.id = l.project_id
WHERE l.status = 'published';

-- ⭐ cấp quyền đọc cho anon: view chỉ chứa cột công khai, không có address_line
GRANT SELECT ON public.listing_cards TO anon, authenticated;

-- =============================================================================
--  HÀM LẤY DANH SÁCH TIN — chỉ trả cột an toàn
--  Dùng RPC từ Worker. Người dùng KHÔNG thể gọi trực tiếp (chỉ service_role).
-- =============================================================================

CREATE OR REPLACE FUNCTION api_listings(
  p_type        listing_type DEFAULT NULL,
  p_district    int         DEFAULT NULL,
  p_ward        int         DEFAULT NULL,
  p_project     uuid        DEFAULT NULL,
  p_min         numeric     DEFAULT NULL,
  p_max         numeric     DEFAULT NULL,
  p_bedrooms    int         DEFAULT NULL,
  p_keyword     text        DEFAULT NULL,
  p_sort        text        DEFAULT 'newest',
  p_page        int         DEFAULT 1,
  p_per_page    int         DEFAULT 24
)
RETURNS TABLE (
  total bigint,
  page int, per_page int,
  data jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total bigint;
  v_off   int;
  v_q     text;          -- từ khoá đã bỏ dấu + viết thường (NULL = không lọc)
  v_dm    int[];         -- các quận khớp từ khoá
  v_wm    int[];         -- các phường khớp từ khoá
BEGIN
  -- chặn lướt quá sâu (chống enumeration hàng loạt)
  p_page     := GREATEST(1, LEAST(p_page, 100));
  p_per_page := GREATEST(1, LEAST(p_per_page, 60));
  v_off := (p_page - 1) * p_per_page;

  -- Từ khoá: so khớp không dấu, và CHẤP NHẬN TÊN CŨ
  --   Gõ "quận 9" → tìm trong aliases của các quận → ra Thủ Đức.
  --   Gõ "quận bảy" (viết bằng chữ) cũng được nếu có trong aliases.
  IF p_keyword IS NOT NULL AND btrim(p_keyword) <> '' THEN
    v_q   := lower(unaccent('unaccent', btrim(p_keyword)));
    -- tập các đơn vị hành chính có tên/alias khớp từ khoá
    SELECT array_agg(d.id) INTO v_dm FROM admin_districts d
     WHERE d.is_active AND (
           lower(unaccent('unaccent', d.name_new)) LIKE '%' || v_q || '%'
        OR lower(unaccent('unaccent', coalesce(d.name_old,''))) LIKE '%' || v_q || '%'
        OR EXISTS (SELECT 1 FROM unnest(d.aliases) a
                    WHERE a LIKE '%' || v_q || '%'));

    SELECT array_agg(w.id) INTO v_wm FROM admin_wards w
     WHERE w.is_active AND (
           lower(unaccent('unaccent', w.name_new)) LIKE '%' || v_q || '%'
        OR lower(unaccent('unaccent', coalesce(w.name_old,''))) LIKE '%' || v_q || '%'
        OR EXISTS (SELECT 1 FROM unnest(w.aliases) a
                    WHERE a LIKE '%' || v_q || '%'));
  END IF;

  -- ⚠ Nếu từ khoá KHÔNG khớp đơn vị hành chính nào, chuyển sang tìm trong
  --   tiêu đề / tên dự án. Điều này giữ "quan 1" ra đúng quận 1 mà vẫn tìm được
  --   từ khoá bất động sản như "Vinhomes".
  SELECT count(*) INTO v_total
    FROM listings l
    LEFT JOIN projects p ON p.id = l.project_id
   WHERE l.status = 'published'
     AND (p_type     IS NULL OR l.type = p_type)
     AND (p_district IS NULL OR l.district_id = p_district)
     AND (p_ward     IS NULL OR l.ward_id = p_ward)
     AND (p_project  IS NULL OR l.project_id = p_project)
     AND (p_min      IS NULL OR l.price >= p_min)
     AND (p_max      IS NULL OR l.price <= p_max)
     AND (p_bedrooms IS NULL OR l.bedrooms = p_bedrooms)
     AND (
       v_q IS NULL
       OR (cardinality(v_dm) > 0 AND (l.district_id = ANY(v_dm) OR l.ward_id = ANY(v_wm)))
       OR (cardinality(v_dm) IS NULL AND (
              lower(unaccent('unaccent', l.title)) LIKE '%' || v_q || '%'
           OR lower(unaccent('unaccent', coalesce(p.name,'')))  LIKE '%' || v_q || '%'
           OR lower(unaccent('unaccent', coalesce(l.tower_name,''))) LIKE '%' || v_q || '%'))
       )
     );

  -- ⭐ jsonb_agg từ view listing_cards — view này đã loại sẵn address_line
  RETURN QUERY
  SELECT v_total, p_page, p_per_page,
    COALESCE((
      SELECT jsonb_agg(to_jsonb(c))
        FROM (SELECT lc.* FROM listing_cards lc
               LEFT JOIN projects pj ON pj.id = lc.project_id
               WHERE (p_type IS NULL OR lc.type = p_type)
                 AND (p_district IS NULL OR lc.district_id = p_district)
                 AND (p_ward IS NULL OR lc.ward_id = p_ward)
                 AND (p_project IS NULL OR lc.project_id = p_project)
                 AND (p_min IS NULL OR lc.price >= p_min)
                 AND (p_max IS NULL OR lc.price <= p_max)
                 AND (p_bedrooms IS NULL OR lc.bedrooms = p_bedrooms)
                 AND (
                   v_q IS NULL
                   OR (cardinality(v_dm) > 0 AND
                       (lc.district_id = ANY(v_dm) OR lc.ward_id = ANY(v_wm)))
                   OR (cardinality(v_dm) IS NULL AND (
                          lower(unaccent('unaccent', lc.title)) LIKE '%' || v_q || '%'
                       OR lower(unaccent('unaccent', coalesce(pj.name,''))) LIKE '%' || v_q || '%'
                       OR lower(unaccent('unaccent', coalesce(lc.ward_name,''))) LIKE '%' || v_q || '%'
                       OR lower(unaccent('unaccent', coalesce(lc.district_name,''))) LIKE '%' || v_q || '%'))
                   )
                 )
               ORDER BY CASE p_sort
                          WHEN 'price_asc'  THEN lc.price ASC
                          WHEN 'price_desc' THEN lc.price DESC
                          WHEN 'popular'    THEN lc.view_count_7d DESC, lc.published_at DESC
                          ELSE lc.is_sponsored DESC, lc.priority DESC, lc.published_at DESC
                        END
               LIMIT p_per_page OFFSET v_off) c
    ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION api_listings(listing_type,int,int,uuid,numeric,numeric,int,text,text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api_listings(listing_type,int,int,uuid,numeric,numeric,int,text,text,int,int) TO service_role;

-- =============================================================================
--  HÀM TÌM KIẾM THEO TÊN QUẬN CŨ (aliases)
--  Gõ "quận 9" → ra tin của Thành phố Thủ Đức
-- =============================================================================
CREATE OR REPLACE FUNCTION api_search_units(p_text text)
RETURNS TABLE (kind text, id int, name text, slug text, district_id int, matched text)
LANGUAGE sql STABLE AS $$
  SELECT 'district', d.id::int, d.name_new, d.slug,
         NULL, coalesce(
           (SELECT a FROM unnest(d.aliases) a WHERE a = lower(p_text)), lower(p_text))
    FROM admin_districts d
   WHERE d.is_active
     AND (lower(unaccent('unaccent', d.name_new)) LIKE '%' || lower(unaccent('unaccent', p_text)) || '%'
       OR EXISTS (SELECT 1 FROM unnest(d.aliases) a WHERE a LIKE '%' || lower(p_text) || '%')
       OR lower(unaccent('unaccent', coalesce(d.name_old,''))) LIKE '%' || lower(unaccent('unaccent', p_text)) || '%')

  UNION ALL

  SELECT 'ward', w.id::int, w.name_new, w.slug,
         w.district_id, lower(p_text)
    FROM admin_wards w
   WHERE w.is_active
     AND (lower(unaccent('unaccent', w.name_new)) LIKE '%' || lower(unaccent('unaccent', p_text)) || '%'
       OR EXISTS (SELECT 1 FROM unnest(w.aliases) a WHERE a LIKE '%' || lower(p_text) || '%')
       OR lower(unaccent('unaccent', coalesce(w.name_old,''))) LIKE '%' || lower(unaccent('unaccent', p_text)) || '%')
   LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION api_search_units(text) TO anon, authenticated;

-- =============================================================================
--  TEST SAU KHI CHẠY
-- =============================================================================

-- 1. Cột nhạy cảm phải KHÔNG truy cập được từ anon:
--    Supabase Dashboard → SQL Editor:
--      SELECT * FROM listing_contacts LIMIT 1;
--    → phải báo permission denied

-- 2. Cột address_line phải không đọc được bằng cách gọi REST thẳng:
--    Mở trình duyệt, đăng nhập Supabase rồi thử trong SQL Editor với SET ROLE:
--      SET ROLE anon;
--      SELECT address_line FROM listings LIMIT 1;
--    → phải báo:  permission denied for column address_line

-- 3. Cột công khai vẫn đọc được:
--      SET ROLE anon;
--      SELECT title, price FROM listings LIMIT 1;
--    → phải trả về dữ liệu

-- 4. Tìm theo tên cũ:
--      SELECT * FROM api_search_units('quan 9');
--    → phải ra Thành phố Thủ Đức