-- =============================================================================
--  001_schema.sql — Toàn bộ cấu trúc database
--  Website Bất động sản TP.HCM
--  Chạy bằng:  Supabase Dashboard → SQL Editor → New query → dán → Run
--               hoặc:  psql "$DATABASE_URL" -f 001_schema.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. KIỂU DỮ LIỆU
-- -----------------------------------------------------------------------------
CREATE TYPE listing_type   AS ENUM ('sell', 'rent');
CREATE TYPE listing_status AS ENUM ('draft', 'pending', 'published', 'expired', 'hidden', 'rejected');
CREATE TYPE user_role      AS ENUM ('customer', 'agent', 'editor', 'admin', 'super_admin');
CREATE TYPE unit_type      AS ENUM ('quận', 'huyện', 'thị xã', 'đặc khu');
CREATE TYPE alert_type     AS ENUM ('bot_detected', 'rate_limit', 'honeypot_hit', 'canary',
                                   'reveal_abuse', 'sequential_crawl', 'ward_sweep',
                                   'no_engagement', 'duplicate_content', 'enumeration');

-- -----------------------------------------------------------------------------
-- 2. ĐƠN VỊ HÀNH CHÍNH
--    Nguồn: Nghị quyết 1685/NQ-UBTVQH15 (hiệu lực 01/07/2025)
--    TP.HCM: 21 đơn vị cấp huyện / 168 đơn vị cấp xã (113 phường, 54 xã, 1 đặc khu)
-- -----------------------------------------------------------------------------
CREATE TABLE admin_districts (
  id          serial PRIMARY KEY,
  code        text UNIQUE NOT NULL,            -- 'Q01', 'THU_DUC', 'CU_CHI'
  slug        text UNIQUE NOT NULL,            -- 'quan-1', 'thu-duc', 'cu-chi'  (dùng cho URL)
  name_new    text NOT NULL,                   -- "Thành phố Thủ Đức"
  name_old    text,                            -- "Quận 9 (trước 2025)"
  aliases     text[] NOT NULL DEFAULT '{}',    -- tìm kiếm: {'quan 9','q9','thu duc'}
  type        unit_type NOT NULL DEFAULT 'quận',
  lat         numeric(9,6),
  lng         numeric(9,6),
  polygon     jsonb,                           -- GeoJSON ranh giới
  sort_order  int NOT NULL DEFAULT 0,
  verified    boolean NOT NULL DEFAULT false,   -- chỉ true sau khi đối chiếu NQ chính thức
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_wards (
  id          serial PRIMARY KEY,
  district_id int NOT NULL REFERENCES admin_districts(id) ON DELETE CASCADE,
  code        text UNIQUE NOT NULL,            -- 'TT01'
  slug        text UNIQUE NOT NULL,            -- 'phuong-thu-thiem'
  name_new    text NOT NULL,                   -- "Phường Thủ Thiêm"
  name_old    text,
  aliases     text[] NOT NULL DEFAULT '{}',
  lat         numeric(9,6),
  lng         numeric(9,6),
  verified    boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wards_district ON admin_wards(district_id);

CREATE TABLE admin_streets (
  id          serial PRIMARY KEY,
  ward_id     int NOT NULL REFERENCES admin_wards(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  aliases     text[] NOT NULL DEFAULT '{}',
  lat         numeric(9,6),
  lng         numeric(9,6),
  is_active   boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_streets_ward ON admin_streets(ward_id);

-- -----------------------------------------------------------------------------
-- 3. HỒ SƠ NGƯỜI DÙNG
--    profiles.id trỏ tới auth.users.id (Supabase Auth quản lý)
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role           user_role NOT NULL DEFAULT 'customer',
  full_name      text,
  phone          text,
  avatar_url     text,
  agency         text,                          -- công ty môi giới
  agency_role    text,                          -- 'director' | 'agent'
  commission_rate numeric(4,2) DEFAULT 0,        -- % hoa hồng
  is_verified    boolean NOT NULL DEFAULT false,
  daily_reveal_limit int NOT NULL DEFAULT 10,   -- số lượt xem SĐT/ngày (KHÔNG tính phí)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_role ON profiles(role);

-- -----------------------------------------------------------------------------
-- 4. DỰ ÁN
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name          text NOT NULL,
  old_names     text[] NOT NULL DEFAULT '{}',
  developer     text,                           -- chủ đầu tư
  address       text,
  ward_id       int REFERENCES admin_wards(id) ON DELETE SET NULL,
  district_id   int REFERENCES admin_districts(id) ON DELETE SET NULL,
  street_id     int REFERENCES admin_streets(id) ON DELETE SET NULL,
  lat           numeric(9,6),
  lng           numeric(9,6),
  polygon       jsonb,
  building_count   int,
  apartment_count  int,
  description   text,
  highlights    text,
  amenities     text[] NOT NULL DEFAULT '{}',
  -- ['hồ bơi','gym','spa','trường học','công viên','bbq','hầm xe','sân tennis','cà phê','cảnh sát']
  hero_image    text,                           -- URL R2 đã ký
  gallery       text[] NOT NULL DEFAULT '{}',
  video_url     text,
  is_verified   boolean NOT NULL DEFAULT false,
  is_published  boolean NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_ward     ON projects(ward_id);
CREATE INDEX idx_projects_district ON projects(district_id);
CREATE INDEX idx_projects_pub      ON projects(is_published, published_at DESC);
CREATE INDEX idx_projects_amenity  ON projects USING gin (amenities);
CREATE INDEX idx_projects_search   ON projects USING gin (
  to_tsvector('simple', name || ' ' || array_to_string(old_names, ' ')));

-- Danh sách toà nhà thuộc dự án
CREATE TABLE project_towers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,                    -- "Toà E1"
  floors      int,
  units_per_floor int,
  is_active   boolean NOT NULL DEFAULT true,
  UNIQUE (project_id, name)
);

-- -----------------------------------------------------------------------------
-- 5. TIN BÁN / CHO THUÊ
--    QUY TẮC VÀNG: cột này KHÔNG BAO GIỜ xuất hiện trong API danh sách
-- -----------------------------------------------------------------------------
CREATE TABLE listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code  text UNIQUE NOT NULL,          -- 'PR-000123' — mã công khai, KHÔNG phải id
  slug            text UNIQUE NOT NULL,          -- 'pr-8f3a-chung-cu-2pn-thu-thiem'

  type            listing_type NOT NULL,
  status          listing_status NOT NULL DEFAULT 'draft',
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  tower_id        uuid REFERENCES project_towers(id) ON DELETE SET NULL,
  tower_name      text,

  title           text NOT NULL,
  ward_id         int REFERENCES admin_wards(id) ON DELETE SET NULL,
  district_id     int REFERENCES admin_districts(id) ON DELETE SET NULL,
  street_id       int REFERENCES admin_streets(id) ON DELETE SET NULL,
  -- ⚠️ ĐỊA CHỈ CHÍNH XÁC — nhạy cảm, không nằm trong response của API list
  --    chỉ trả khi đã đăng nhập + đã mở chi tiết
  address_line    text,

  price           numeric(14,2) NOT NULL,       -- ⚠ LUÔN tính bằng TRIỆU
  -- price_unit chỉ là GỢI Ý HIỂN THỊ. Không dùng nó để so sánh/lọc/sắp xếp,
  -- vì nếu lưu "7.323" + "tỷ" thì 7000 triệu sẽ bị so sánh như 7.
  -- Mọi phép tính trên giá đều dùng `price` (đơn vị triệu).
  price_unit      text GENERATED ALWAYS AS ('triệu') STORED,
  negotiable      boolean NOT NULL DEFAULT false,

  area            numeric(8,2),
  bedrooms        int,
  bathrooms       int,
  floors          int,
  floor_number    int,
  direction       text,
  furniture       text,
  features        text[] NOT NULL DEFAULT '{}',
  description     text,
  video_url       text,

  images          text[] NOT NULL DEFAULT '{}', -- URL R2 đã ký
  content_hash    text,                          -- md5 phát hiện tin bị copy
  is_sponsored    boolean NOT NULL DEFAULT false,

  -- quản lý
  agent_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  commission_rate numeric(4,2),
  priority        int NOT NULL DEFAULT 0,
  published_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- chống cào
  view_count      int NOT NULL DEFAULT 0,
  view_count_7d   int NOT NULL DEFAULT 0
);

-- Index phục vụ trang danh sách (chỉ published)
CREATE INDEX idx_listings_browse  ON listings(status, type, district_id, published_at DESC)
  WHERE status = 'published';
CREATE INDEX idx_listings_ward    ON listings(ward_id, price DESC)  WHERE status = 'published';
CREATE INDEX idx_listings_project ON listings(project_id)         WHERE status = 'published';
CREATE INDEX idx_listings_price   ON listings(price)              WHERE status = 'published';
CREATE INDEX idx_listings_agent   ON listings(agent_id, status);
CREATE INDEX idx_listings_pending ON listings(created_at DESC)      WHERE status = 'pending';
CREATE INDEX idx_listings_search  ON listings USING gin (
  to_tsvector('simple',
    coalesce(title,'') || ' ' ||
    coalesce(address_line,'') || ' ' ||
    coalesce(tower_name,'')));

-- -----------------------------------------------------------------------------
-- 6. ⭐ THÔNG TIN LIÊN HỆ — TÁCH RIÊNG, KHÓA CHẶT
--    Bảng này KHÔNG BAO GIỜ được join vào query danh sách
--    RLS: không có policy nào cho anon/user → chỉ service_role đọc được
-- -----------------------------------------------------------------------------
CREATE TABLE listing_contacts (
  listing_id      uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  contact_name    text,
  contact_phone   text,
  contact_zalo    text,
  contact_email   text,
  full_address    text,                          -- "Tòa E1, 02DN, P. Thủ Thiêm, TP Thủ Đức"
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. KHÁCH HÀNG / YÊU CẦU LIÊN HỆ
-- -----------------------------------------------------------------------------
CREATE TABLE leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  full_name    text NOT NULL,
  phone        text NOT NULL,
  email        text,
  message      text,
  source       text,                            -- 'listing' | 'project' | 'contact_form'
  ip_hash      text,                            -- hash HMAC, KHÔNG lưu IP gốc (NĐ13)
  user_agent   text,
  agent_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- đã phân công
  status       text NOT NULL DEFAULT 'new',     -- new | contacted | closed | spam
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_status  ON leads(status, created_at DESC);
CREATE INDEX idx_leads_agent   ON leads(agent_id, status);
CREATE INDEX idx_leads_listing ON leads(listing_id);

-- -----------------------------------------------------------------------------
-- 8. HOA HỒNG (quản lý cả đội môi giới)
-- -----------------------------------------------------------------------------
CREATE TABLE agent_commissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  agent_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deal_amount numeric(14,2),
  rate        numeric(4,2),
  amount      numeric(14,2),
  status      text NOT NULL DEFAULT 'pending',  -- pending | agreed | paid
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 9. LOG XEM SỐ ĐIỆN THOẠI
-- -----------------------------------------------------------------------------
CREATE TABLE contact_reveals (
  id          bigserial PRIMARY KEY,
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash     text,                             -- hash HMAC, KHÔNG lưu IP gốc
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reveals_user    ON contact_reveals(user_id, created_at DESC);
CREATE INDEX idx_reveals_listing ON contact_reveals(listing_id);
CREATE INDEX idx_reveals_time    ON contact_reveals(created_at DESC);

-- -----------------------------------------------------------------------------
-- 10. CẢNH BÁO BẤT THƯỜNG
-- -----------------------------------------------------------------------------
CREATE TABLE access_alerts (
  id          bigserial PRIMARY KEY,
  alert_type  alert_type NOT NULL,
  severity    text NOT NULL DEFAULT 'low',      -- low | medium | high
  fingerprint text,                             -- hash(ip + ua)
  ip_hash     text,
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  detail      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_alerts_open   ON access_alerts(created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_alerts_type   ON access_alerts(alert_type, created_at DESC);

-- Bảng "nhạy cảm" để chặn IP ngay lập tức
CREATE TABLE blocked_fingerprints (
  fingerprint text PRIMARY KEY,
  reason      text,
  blocked_until timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 11. AUDIT LOG — ai sửa gì
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          bigserial PRIMARY KEY,
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action      text NOT NULL,                    -- 'listing.update', 'contact.view', 'user.role'
  target_type text,
  target_id   text,
  before_data jsonb,
  after_data  jsonb,
  ip_hash     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_time  ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 12. TIN NHẮN / THÔNG BÁO
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text,
  link       text,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON notifications(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 13. CÀI ĐẶT
-- -----------------------------------------------------------------------------
CREATE TABLE site_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site_settings (key, value) VALUES
  ('contact', '{"price_mode":"free","daily_limit_enabled":false,"mask_phone":true,"require_login":true}'),
  ('seo',     '{"site_name":"","description":"","keywords":[]}');

-- =============================================================================
--  14. TỰ SINH SLUG CHO ĐƠN VỊ HÀNH CHÍNH
--
--  Bỏ dấu tiếng Việt + đổi khoảng trắng thành dấu gạch nối.
--  Quan trọng: khi import 168 phường từ CSV, KHÔNG phải nhập slug —
--  trigger tự lo. Giảm đáng kể rủi ro nhập sai.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION fill_slug() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_base text;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  -- Bỏ tiền tố hành chính, nhưng GIỮ nếu phần còn lại chỉ là số
  --   "Thành phố Thủ Đức" → "thu-duc"
  --   "Quận 1"            → "quan-1"      (vì "1" là số, không dùng làm slug)
  v_base := regexp_replace(
    unaccent('unaccent', NEW.name_new),
    '^(Quận|Phường|Xã|Thị xã|Huyện|Thành phố|Thị trấn)\s+',
    '', 'i');

  v_base := trim(both '-' FROM regexp_replace(lower(v_base), '[^a-z0-9]+', '-', 'g'));

  IF v_base ~ '^[0-9]+$' THEN
    v_base := lower(regexp_replace(unaccent('unaccent', NEW.name_new), '[^a-z0-9]+', '-', 'g'));
  END IF;

  NEW.slug := trim(both '-' FROM v_base);
  RETURN NEW;
END $$;

CREATE TRIGGER t_district_slug BEFORE INSERT OR UPDATE OF name_new, slug
  ON admin_districts FOR EACH ROW EXECUTE FUNCTION fill_slug();
CREATE TRIGGER t_ward_slug BEFORE INSERT OR UPDATE OF name_new, slug
  ON admin_wards FOR EACH ROW EXECUTE FUNCTION fill_slug();

-- -----------------------------------------------------------------------------
-- 15. HÀM CẬP NHẬT updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER t_listings  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_projects  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_profiles  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_contact   BEFORE UPDATE ON listing_contacts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();