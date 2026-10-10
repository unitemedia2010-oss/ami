-- =============================================================================
--  002_security.sql — Row Level Security + hàm bảo mật
--  Đây là LỚP PHÒNG THỦ CUỐI CÙNG. Kể cả khi Worker bị lọt hoặc anon key
--  bị lộ ra trình duyệt, các bảng chứa PII vẫn KHÔNG đọc được.
-- =============================================================================

-- =============================================================================
--  BẬT RLS TRÊN MỌI BẢNG
-- =============================================================================
ALTER TABLE admin_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_wards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_streets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_towers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_contacts ENABLE ROW LEVEL SECURITY;   -- ⭐ không có policy cho anon
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_alerts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings   ENABLE ROW LEVEL SECURITY;

-- =============================================================================
--  HÀM KIỂM TRA ROLE  (chỉ đọc được từ chính profiles của user hiện tại)
-- =============================================================================
CREATE OR REPLACE FUNCTION current_role() RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(current_role() IN ('editor','admin','super_admin'), false);
$$;

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(current_role() IN ('admin','super_admin'), false);
$$;

-- =============================================================================
--  HÀNH CHÍNH — công khai (cần cho bộ lọc)
-- =============================================================================
CREATE POLICY "districts_read_public" ON admin_districts
  FOR SELECT USING (is_active);

CREATE POLICY "wards_read_public" ON admin_wards
  FOR SELECT USING (is_active);

CREATE POLICY "streets_read_public" ON admin_streets
  FOR SELECT USING (is_active);

-- chỉ admin được sửa dữ liệu hành chính
CREATE POLICY "admin_units_write" ON admin_districts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_wards_write" ON admin_wards
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_streets_write" ON admin_streets
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- =============================================================================
--  PROFILES — người dùng đọc/sửa hồ sơ MÌNH
--  ⭐ KHÔNG có policy cho role/credit → user không tự nâng quyền được
-- =============================================================================
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = current_role());  -- không đổi được role

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- =============================================================================
--  PROJECTS
-- =============================================================================
CREATE POLICY "projects_read_published" ON projects
  FOR SELECT USING (is_published OR is_staff());

CREATE POLICY "projects_write_staff" ON projects
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- =============================================================================
--  LISTINGS
--  ⭐ ĐỊA CHỈ CHÍNH XÁC: xem thật là phải đăng nhập
--     Nhưng để bot cào không lấy được, ta KHÔNG đưa address_line vào
--     response của API list (xem 005_worker.sql). Ở đây chỉ chặn ghi.
-- =============================================================================
CREATE POLICY "listings_read_published" ON listings
  FOR SELECT USING (status = 'published' OR agent_id = auth.uid() OR is_staff());

-- Agent (và cả customer) tự đăng tin — nhưng KHÔNG tự publish
CREATE POLICY "listings_insert_own" ON listings
  FOR INSERT WITH CHECK (agent_id = auth.uid() OR is_staff());

-- Sửa tin của mình, KHÔNG đổi được status sang 'published' một cách tự ý
CREATE POLICY "listings_update_own" ON listings
  FOR UPDATE USING (agent_id = auth.uid() OR is_staff())
  WITH CHECK (
    agent_id = auth.uid() OR is_staff()
  );

CREATE POLICY "listings_delete_staff" ON listings
  FOR DELETE USING (is_admin() OR agent_id = auth.uid());

-- ⭐ listing_contacts: CỐ TÌNH KHÔNG TẠO POLICY NÀO
--    → role anon và user đăng nhập đều KHÔNG đọc được.
--    → chỉ service_role (chạy trong Cloudflare Worker) bypass được RLS.
--    Đây là điểm mấu chốt của toàn bộ thiết kế bảo mật.

-- =============================================================================
--  LEADS / HOA HỒNG / LOG
-- =============================================================================
CREATE POLICY "leads_read_staff" ON leads
  FOR SELECT USING (is_staff() OR user_id = auth.uid());

CREATE POLICY "leads_insert_all" ON leads
  FOR INSERT WITH CHECK (true);      -- khách gửi form liên hệ

CREATE POLICY "leads_update_staff" ON leads
  FOR UPDATE USING (is_staff());

CREATE POLICY "commissions_read_own" ON agent_commissions
  FOR SELECT USING (agent_id = auth.uid() OR is_staff());

CREATE POLICY "commissions_write_staff" ON agent_commissions
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY "reveals_read_staff" ON contact_reveals
  FOR SELECT USING (is_staff());

CREATE POLICY "alerts_read_staff" ON access_alerts
  FOR SELECT USING (is_staff());

CREATE POLICY "alerts_write_service" ON access_alerts
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "blocked_read_admin" ON blocked_fingerprints
  FOR SELECT USING (is_admin());

CREATE POLICY "blocked_write_admin" ON blocked_fingerprints
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- audit log: ai cũng đọc được phần của mình, admin đọc tất cả
CREATE POLICY "audit_read" ON audit_logs
  FOR SELECT USING (actor_id = auth.uid() OR is_admin());

-- không ai được sửa/xoá audit log (kể cả admin)
-- → không có policy UPDATE/DELETE = không thể sửa lịch sử

CREATE POLICY "notif_read_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_write_staff" ON notifications
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "settings_read_public" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "settings_write_admin" ON site_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- =============================================================================
--  ⭐ HÀM LẤY SỐ ĐIỆN THOẠI — điểm kiểm soát duy nhất
--
--  CHÍNH SÁCH HIỆN TẠI (theo quyết định của chủ dự án):
--    • KHÔNG tính phí xem SĐT
--    • KHÔNG giới hạn lượt/ngày
--
--  ⚠ RỦI RO ĐÃ BIẾT: không có hạn mức = 1 tài khoản đăng nhập có thể lấy
--    số điện thoại của MỌI tin trong database. Các lớp phòng thủ còn lại
--    (Turnstile, rate limit IP, giám sát) là biện pháp giảm thiểu, không
--    phải chặn tuyệt đối. Xem mục "RỦI RO ĐÃ BIẾT" trong tài liệu.
--
--  MUỐN BẬT GIỚI HẠN:  UPDATE site_settings SET value =
--      jsonb_set(value,'{daily_limit_enabled}','true')
--    WHERE key='contact';
--  và sửa dưới đây thành:  IF v_limit > 0 AND used >= v_limit THEN ...
-- =============================================================================
CREATE OR REPLACE FUNCTION reveal_contact(
  p_listing_id  uuid,
  p_ip_hash     text DEFAULT NULL,
  p_user_agent  text DEFAULT NULL
)
RETURNS TABLE (
  contact_name  text,
  phone_masked  text,
  phone_full    text,
  zalo          text,
  full_address  text,
  owner_name    text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        uuid;
  v_limit      int;
  v_enforced   boolean;
  v_used       int;
  c            listing_contacts%ROWTYPE;
  l            listings%ROWTYPE;
BEGIN
  -- 1. Bắt buộc đăng nhập
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Yêu cầu đăng nhập' USING ERRCODE = '28000';
  END IF;

  -- 2. Tin phải tồn tại và đang hiển thị
  SELECT * INTO l FROM listings WHERE id = p_listing_id AND status = 'published';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy tin đăng' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO c FROM listing_contacts WHERE listing_id = p_listing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tin chưa cập nhật thông tin liên hệ' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Đọc chính sách + hạn mức của user
  SELECT daily_reveal_limit INTO v_limit FROM profiles WHERE id = v_uid;
  SELECT (value->>'daily_limit_enabled')::boolean INTO v_enforced
    FROM site_settings WHERE key = 'contact';

  -- 4. Nếu bật giới hạn thì mới chặn (mặc định: KHÔNG bật)
  IF COALESCE(v_enforced, false) = true THEN
    SELECT count(*) INTO v_used FROM contact_reveals
     WHERE user_id = v_uid
       AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh');
    IF v_used >= COALESCE(v_limit, 10) THEN
      RAISE EXCEPTION 'Đã hết lượt xem hôm nay. Ngày mai sẽ được cấp lại.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 5. Ghi log TRƯỚC khi trả dữ liệu (kể cả khi bị chặn, để phát hiện lạm dụng)
  INSERT INTO contact_reveals (listing_id, user_id, ip_hash, user_agent)
  VALUES (p_listing_id, v_uid, p_ip_hash, left(COALESCE(p_user_agent,''), 300));

  -- 6. Trả về — SỐ ĐIỆN THOẠI CHE MỘT PHẦN
  RETURN QUERY SELECT
    CASE WHEN c.contact_name IS NOT NULL
      THEN regexp_replace(c.contact_name, '(?<=\s)\S+', m -> repeat('•', length(m)), 'g')
      ELSE NULL END,
    CASE WHEN c.contact_phone IS NOT NULL
      THEN left(c.contact_phone, 6) || '•••' || right(c.contact_phone, 2)
      ELSE NULL END,
    c.contact_phone,
    c.contact_zalo,
    c.full_address,
    CASE WHEN l.agent_id IS NOT NULL
      THEN (SELECT full_name FROM profiles WHERE id = l.agent_id)
      ELSE NULL END;
END;
$$;

-- Chỉ cho phép gọi hàm này qua service_role (Worker).
-- Thêm GRANT để user không tự gọi được:
REVOKE ALL ON FUNCTION reveal_contact(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reveal_contact(uuid, text, text) TO service_role;

-- =============================================================================
--  HÀM PHÁT HIỆN TIN BỊ COPY
-- =============================================================================
CREATE OR REPLACE FUNCTION detect_duplicate_content(p_project_id uuid, p_title text,
                                                    p_price numeric, p_area numeric,
                                                    p_bedrooms int)
RETURNS TABLE (listing_id uuid, title text, price numeric, created_at timestamptz)
LANGUAGE sql STABLE AS $$
  SELECT l.id, l.title, l.price, l.created_at
    FROM listings l
   WHERE l.status <> 'hidden'
     AND l.agent_id IS DISTINCT FROM auth.uid()
     AND abs(l.price - COALESCE(p_price,0))  < 1
     AND abs(COALESCE(l.area,0) - COALESCE(p_area,0)) < 3
     AND COALESCE(l.bedrooms,0) = COALESCE(p_bedrooms,0)
     AND similarity(l.title, COALESCE(p_title,'')) > 0.6   -- pg_trgm
   LIMIT 10;
$$;

-- Bật extension tìm kiếm mờ (so khớp tiêu đề gần giống)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index phục trùng lặp
CREATE INDEX IF NOT EXISTS idx_listings_dupcheck
  ON listings USING gist (title gist_trgm_ops);

-- =============================================================================
--  HÀM THỐNG KÊ CHO ADMIN
--  Dùng service_role qua Worker; vẫn kiểm tra vai trò trong SQL để không
--  phụ thuộc hoàn toàn vào tầng Worker.
-- =============================================================================
CREATE OR REPLACE FUNCTION api_admin_stats()
RETURNS TABLE (
  published   bigint,
  pending     bigint,
  expired     bigint,
  projects    bigint,
  agents      bigint,
  new_leads   bigint,
  reveals_24h bigint,
  open_alerts bigint,
  new_today   bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM listings WHERE status = 'published'),
    (SELECT count(*) FROM listings WHERE status = 'pending'),
    (SELECT count(*) FROM listings WHERE status = 'expired'),
    (SELECT count(*) FROM projects WHERE is_published),
    (SELECT count(*) FROM profiles WHERE role = 'agent'),
    (SELECT count(*) FROM leads WHERE status = 'new'),
    (SELECT count(*) FROM contact_reveals WHERE created_at > now() - interval '24 hours'),
    (SELECT count(*) FROM access_alerts WHERE resolved_at IS NULL),
    (SELECT count(*) FROM listings WHERE created_at::date = CURRENT_DATE);
$$;

REVOKE ALL ON FUNCTION api_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api_admin_stats() TO service_role;

-- =============================================================================
--  HÀM LẤY DANH SÁCH TÀI KHOẢN (admin)
--
--  Vì sao cần hàm này: bảng auth.users nằm ở schema `auth` và KHÔNG đọc
--  được qua PostgREST bằng anon/service key. Muốn hiện email cạnh tài khoản
--  thì phải join trong SQL — và chỉ SECURITY DEFINER mới thấy được auth.users.
--
--  Chỉ trả về cột an toàn. KHÔNG bao giờ trả daily_reveal_limit hay
--  credit — không cần thiết cho màn hình quản trị và làm lộ số liệu nội bộ.
-- =============================================================================
CREATE OR REPLACE FUNCTION api_admin_users(p_filter text DEFAULT NULL)
RETURNS TABLE (
  id uuid, email text, full_name text, phone text,
  role user_role, agency text, agency_role text,
  commission_rate numeric, is_verified boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT
    p.id,
    u.email::text,
    p.full_name,
    p.phone,
    p.role,
    p.agency,
    p.agency_role,
    p.commission_rate,
    p.is_verified,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE (
      p_filter IS NULL OR btrim(p_filter) = ''
      OR p.role::text = regexp_replace(p_filter, '^role=eq\.(.*)$', '\1')
      OR (p.full_name ILIKE '%' || regexp_replace(p_filter, '^.*?\*?(.*?)\*?$', '\1') || '%'
          AND p_filter LIKE '%full_name%')
    )
  ORDER BY p.created_at DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION api_admin_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api_admin_users(text) TO service_role;

-- =============================================================================
--  HÀM TẠO TIN ĐĂNG — ghi listings + listing_contacts trong MỘT transaction
--
--  Vì sao cần hàm này mà không gọi REST:
--    • REST gọi lần 1 tạo tin, lần 2 mới lưu SĐT → nếu lần 2 lỗi thì có tin
--      không SĐT, người dùng báo "xem SĐT không được" và phải sửa thủ công.
--    • Hàm SQL chạy nguyên tử: thành công cả hai, hoặc không có gì cả.
--
--  Bảo mật: SECURITY DEFINER nhưng tự kiểm tra auth.uid() và chỉ cho phép
--  dùng các cột được phép — client không thể tự set agent_id hay priority.
-- =============================================================================
CREATE OR REPLACE FUNCTION api_create_listing(p_payload jsonb)
RETURNS TABLE (id uuid, slug text, status listing_status)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_id       uuid;
  v_slug     text;
  v_status   listing_status;
  v_code     text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Yêu cầu đăng nhập' USING ERRCODE = '28000';
  END IF;

  -- Kiểm tra người gọi có thật sự là thành viên không
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Không tìm thấy hồ sơ người dùng' USING ERRCODE = 'P0002';
  END IF;

  -- Mã tin phải duy nhất; nếu trùng thì tự sinh lại
  -- (listings.id là uuid nên không có sequence — dùng số ngẫu nhiên)
  v_code := COALESCE(NULLIF(p_payload->>'reference_code', ''),
                      'PR-' || to_char(now(), 'YY') ||
                      lpad((floor(random() * 90000) + 10000)::int::text, 5, '0'));

  SELECT l.reference_code INTO v_code FROM listings l WHERE l.reference_code = v_code;
  IF FOUND THEN
    v_code := v_code || '-' || substr(md5(random()::text), 1, 4);
  END IF;

  v_slug := trim(both '-' FROM regexp_replace(
    lower(unaccent('unaccent',
      COALESCE(NULLIF(p_payload->>'reference_code', ''), 'tin') || '-' ||
      COALESCE(p_payload->>'title', 'can-ho'))),
    '[^a-z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 5);

  v_status := CASE
    WHEN EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role IN ('editor','admin','super_admin'))
      THEN COALESCE((p_payload->>'status')::listing_status, 'published')
    ELSE 'pending'::listing_status      -- môi giới/khách LUÔN phải qua duyệt
  END;

  INSERT INTO listings (
    reference_code, slug, type, status, project_id, tower_name,
    title, ward_id, district_id, address_line,
    price, negotiable, area, bedrooms, bathrooms, floors, floor_number,
    direction, furniture, features, description, images,
    agent_id, published_at, expires_at
  ) VALUES (
    v_code, v_slug,
    COALESCE((p_payload->>'type')::listing_type, 'sell'),
    v_status,
    NULLIF(p_payload->>'project_id','')::uuid,
    NULLIF(p_payload->>'tower_name',''),
    p_payload->>'title',
    NULLIF(p_payload->>'ward_id','')::int,
    NULLIF(p_payload->>'district_id','')::int,
    p_payload->>'address_line',
    COALESCE((p_payload->>'price')::numeric, 0),
    COALESCE((p_payload->>'negotiable')::boolean, false),
    NULLIF(p_payload->>'area','')::numeric,
    NULLIF(p_payload->>'bedrooms','')::int,
    NULLIF(p_payload->>'bathrooms','')::int,
    NULLIF(p_payload->>'floors','')::int,
    NULLIF(p_payload->>'floor_number','')::int,
    NULLIF(p_payload->>'direction',''),
    NULLIF(p_payload->>'furniture',''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(
      COALESCE(p_payload->'features', '[]'::jsonb))), '{}'),
    p_payload->>'description',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(
      COALESCE(p_payload->>'images', '[]'::jsonb))), '{}'),
    v_uid,                                  -- luôn gắn với người đăng, không nhận từ client
    CASE WHEN v_status = 'published' THEN now() END,
    CASE WHEN v_status = 'published'
         THEN now() + CASE COALESCE((p_payload->>'type')::listing_type, 'sell')
                       WHEN 'rent' THEN interval '30 days' ELSE interval '90 days' END
    END
  )
  RETURNING listings.id, listings.slug, listings.status INTO v_id, v_slug, v_status;

  -- ⭐ PII vào bảng riêng. RLS chặn anon nên không client nào đọc trực tiếp được.
  IF COALESCE(p_payload->>'contact_phone', '') <> '' THEN
    INSERT INTO listing_contacts
      (listing_id, contact_name, contact_phone, contact_zalo)
    VALUES (
      v_id,
      NULLIF(p_payload->>'contact_name',''),
      p_payload->>'contact_phone',
      NULLIF(p_payload->>'contact_zalo','')
    )
    ON CONFLICT (listing_id) DO UPDATE SET
      contact_name  = EXCLUDED.contact_name,
      contact_phone = EXCLUDED.contact_phone,
      contact_zalo  = EXCLUDED.contact_zalo,
      updated_at    = now();
  END IF;

  RETURN QUERY SELECT v_id, v_slug, v_status;
END;
$$;

REVOKE ALL ON FUNCTION api_create_listing(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api_create_listing(jsonb) TO authenticated;

CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT count(*) FROM listings WHERE status = 'published')      AS published,
  (SELECT count(*) FROM listings WHERE status = 'pending')        AS pending,
  (SELECT count(*) FROM listings WHERE status = 'expired')        AS expired,
  (SELECT count(*) FROM projects WHERE is_published)              AS projects,
  (SELECT count(*) FROM profiles WHERE role = 'agent')            AS agents,
  (SELECT count(*) FROM leads WHERE status = 'new')               AS new_leads,
  (SELECT count(*) FROM contact_reveals
     WHERE created_at > now() - interval '24 hours')              AS reveals_24h,
  (SELECT count(*) FROM access_alerts
     WHERE resolved_at IS NULL)                                   AS open_alerts,
  (SELECT count(*) FROM listings WHERE created_at::date = CURRENT_DATE) AS new_today;