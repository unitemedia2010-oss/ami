/**
 * Dữ liệu đơn vị hành chính dùng CHO LÚC BUILD (static export).
 *
 * ⚠ Nguồn chính thức: Nghị quyết 1685/NQ-UBTVQH15 (hiệu lực 01/07/2025).
 *   File này PHẢI khớp với bảng `admin_districts` trong database.
 *   Nếu bạn sửa tên trong SQL → sửa cả ở đây, nếu không trang /quan/[slug]
 *   sẽ sinh ra URL 404 vĩnh viễn (rất tệ cho SEO).
 *
 * `verified: false` = chưa đối chiếu trực tiếp với Nghị quyết.
 */

export interface DistrictSeed {
  code: string;
  slug: string;
  name_new: string;
  name_old: string | null;
  region: 'noi-thanh' | 'moi' | 'ngoai-thanh';
  verified: boolean;
}

export const DISTRICTS: DistrictSeed[] = [
  // ---------------------------------------------------------- nội thành
  { code: 'Q01', slug: 'quan-1', name_new: 'Quận 1', name_old: 'Quận 1',
    region: 'noi-thanh', verified: false },
  { code: 'Q03', slug: 'quan-3', name_new: 'Quận 3', name_old: 'Quận 3',
    region: 'noi-thanh', verified: false },
  { code: 'Q04', slug: 'quan-4', name_new: 'Quận 4', name_old: 'Quận 4',
    region: 'noi-thanh', verified: false },
  { code: 'Q05', slug: 'quan-5', name_new: 'Quận 5', name_old: 'Quận 5',
    region: 'noi-thanh', verified: false },
  { code: 'Q06', slug: 'quan-6', name_new: 'Quận 6', name_old: 'Quận 6',
    region: 'noi-thanh', verified: false },
  { code: 'Q07', slug: 'quan-7', name_new: 'Quận 7', name_old: 'Quận 7',
    region: 'noi-thanh', verified: false },
  { code: 'Q08', slug: 'quan-8', name_new: 'Quận 8', name_old: 'Quận 8',
    region: 'noi-thanh', verified: false },
  { code: 'Q10', slug: 'quan-10', name_new: 'Quận 10', name_old: 'Quận 10',
    region: 'noi-thanh', verified: false },
  { code: 'Q11', slug: 'quan-11', name_new: 'Quận 11', name_old: 'Quận 11',
    region: 'noi-thanh', verified: false },
  { code: 'Q12', slug: 'quan-12', name_new: 'Quận 12', name_old: 'Quận 12',
    region: 'noi-thanh', verified: false },

  // ------------------------------------------------- đơn vị mới sau sáp nhập
  { code: 'THU_DUC', slug: 'thu-duc', name_new: 'Thành phố Thủ Đức',
    name_old: 'Quận Thủ Đức, Quận 2, Quận 9', region: 'moi', verified: false },
  { code: 'BINH_THUAN', slug: 'binh-thuan', name_new: 'Quận Bình Thuận',
    name_old: 'Phường Bình Thuận, Quận Bình Thạnh', region: 'moi', verified: false },
  { code: 'CAT_LAI', slug: 'cat-lai', name_new: 'Quận Cát Lái',
    name_old: 'Quận 2 và phường Cát Lái', region: 'moi', verified: false },
  { code: 'PHU_CUONG', slug: 'phu-cuong', name_new: 'Phường Phú Cường',
    name_old: 'Thành phố Thủ Dầu Một', region: 'moi', verified: false },
  { code: 'VUNG_LIEM', slug: 'vung-liem', name_new: 'Quận Vũng Liêm',
    name_old: 'Thị xã Vũng Liêm', region: 'moi', verified: false },
  { code: 'BEN_TRE', slug: 'ben-tre', name_new: 'Quận Bến Tre',
    name_old: 'Thị xã Bến Tre', region: 'moi', verified: false },

  // -------------------------------------------------------- ngoại thành
  { code: 'BINH_TAN', slug: 'binh-tan', name_new: 'Quận Bình Tân',
    name_old: 'Quận Bình Tân', region: 'ngoai-thanh', verified: false },
  { code: 'BINH_CHANH', slug: 'binh-chanh', name_new: 'Thành phố Bình Chánh',
    name_old: 'Quận Bình Chánh', region: 'ngoai-thanh', verified: false },
  { code: 'CU_CHI', slug: 'cu-chi', name_new: 'Thị xã Củ Chi',
    name_old: 'Huyện Củ Chi', region: 'ngoai-thanh', verified: false },
  { code: 'GO_VAP', slug: 'go-vap', name_new: 'Quận Gò Vấp',
    name_old: 'Quận Gò Vấp', region: 'ngoai-thanh', verified: false },
  { code: 'HOC_MON', slug: 'hoc-mon', name_new: 'Huyện Hóc Môn',
    name_old: 'Huyện Hóc Môn', region: 'ngoai-thanh', verified: false },
  { code: 'PHU_NHUAN', slug: 'phu-nhuan', name_new: 'Phường Phú Nhuận',
    name_old: 'Quận Phú Nhuận', region: 'ngoai-thanh', verified: false },
  { code: 'TAN_BINH', slug: 'tan-binh', name_new: 'Phường Tân Bình',
    name_old: 'Quận Tân Bình', region: 'ngoai-thanh', verified: false },
  { code: 'TAN_PHU', slug: 'tan-phu', name_new: 'Quận Tân Phú',
    name_old: 'Quận Tân Phú', region: 'ngoai-thanh', verified: false },
  { code: 'NHON_TRACH', slug: 'nhon-trach', name_new: 'Thị xã Nhơn Trạch',
    name_old: 'Huyện Nhơn Trạch', region: 'ngoai-thanh', verified: false },
];

export const REGION_LABEL: Record<DistrictSeed['region'], string> = {
  'noi-thanh': 'Nội thành',
  'moi': 'Đơn vị mới sau sáp nhập',
  'ngoai-thanh': 'Ngoại thành',
};

/** Mô tả chuẩn cho SEO — đổi theo từng quận sau khi đã xác minh */
export const DISTRICT_BLURB: Record<string, string> = {
  'quan-1':
    'Trung tâm kinh tế của TP.HCM, tập trung các tòa văn phòng, chung cư cao cấp và cửa hàng. Phù hợp người đi làm văn phòng và muốn ở ngay trung tâm.',
  'thu-duc':
    'Khu vực phía Đông, gom Quận 2, Quận 9 và Quận Thủ Đức trước đây — khu tập trung dự án chung cư lớn nhất TP.HCM như Vinhomes, The Prive, Masteri Thảo Điền.',
  'quan-7':
    'Khu đô thị mới, tập trung trung tâm thương mại, trường ĐH Quốc Gia và nhiều khu chung cư cao cấp ven sông.',
  'binh-thuan':
    'Khu vực phía Đông-Nam, tập trung trung tâm thương mại, cao ốc văn phòng và nhiều dự án căn hộ sắp triển khai.',
  'go-vap':
    'Quận nội thành phía Bắc, tập trung dân cư đông đúc, nhiều dự án căn hộ giá tầm trung và nhiều trường học.',
  'tan-phu':
    'Quận nội thành phía Tây Nam, tập trung nghề may, có khu dân cư đông và nhiều dự án căn hộ giá vừa.',
};

export const findBySlug = (slug: string) => DISTRICTS.find((d) => d.slug === slug);