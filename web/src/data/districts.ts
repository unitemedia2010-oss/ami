/**
 * ⚠ FILE NÀY ĐƯỢC SINH TỰ ĐỘNG — đừng sửa tay.
 *
 *   Nguồn duy nhất: tools/build_27k.mjs (mảng DISTRICTS).
 *   Chạy `node tools/build_27k.mjs` để cập nhật.
 *
 *   Sinh tự động vì trang /quan/[slug] khai báo generateStaticParams từ đây.
 *   Nếu viết tay và lệch với public/data/districts.json thì sẽ có slug
 *   sinh ra trang rỗng và thiếu slug thật (404 vĩnh viễn trên static export).
 *
 *   `verified: false` = chưa đối chiếu trực tiếp với Nghị quyết 1685/NQ-UBTVQH15.
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
  {
    "code": "QUAN_1",
    "slug": "quan-1",
    "name_new": "Quận 1",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_2",
    "slug": "quan-2",
    "name_new": "Quận 2",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_3",
    "slug": "quan-3",
    "name_new": "Quận 3",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_4",
    "slug": "quan-4",
    "name_new": "Quận 4",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_5",
    "slug": "quan-5",
    "name_new": "Quận 5",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_6",
    "slug": "quan-6",
    "name_new": "Quận 6",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_7",
    "slug": "quan-7",
    "name_new": "Quận 7",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_8",
    "slug": "quan-8",
    "name_new": "Quận 8",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_9",
    "slug": "quan-9",
    "name_new": "Quận 9",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_10",
    "slug": "quan-10",
    "name_new": "Quận 10",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_11",
    "slug": "quan-11",
    "name_new": "Quận 11",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "QUAN_12",
    "slug": "quan-12",
    "name_new": "Quận 12",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "BINH_THANH",
    "slug": "binh-thanh",
    "name_new": "Bình Thạnh",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "BINH_TAN",
    "slug": "binh-tan",
    "name_new": "Bình Tân",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "GO_VAP",
    "slug": "go-vap",
    "name_new": "Gò Vấp",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "PHU_NHUAN",
    "slug": "phu-nhuan",
    "name_new": "Phú Nhuận",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "TAN_BINH",
    "slug": "tan-binh",
    "name_new": "Tân Bình",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "TAN_PHU",
    "slug": "tan-phu",
    "name_new": "Tân Phú",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "THU_DUC",
    "slug": "thu-duc",
    "name_new": "Thủ Đức",
    "name_old": null,
    "region": "noi-thanh",
    "verified": false
  },
  {
    "code": "BINH_CHANH",
    "slug": "binh-chanh",
    "name_new": "Bình Chánh",
    "name_old": null,
    "region": "ngoai-thanh",
    "verified": false
  },
  {
    "code": "CU_CHI",
    "slug": "cu-chi",
    "name_new": "Củ Chi",
    "name_old": null,
    "region": "ngoai-thanh",
    "verified": false
  },
  {
    "code": "HOC_MON",
    "slug": "hoc-mon",
    "name_new": "Hóc Môn",
    "name_old": null,
    "region": "ngoai-thanh",
    "verified": false
  },
  {
    "code": "NHA_BE",
    "slug": "nha-be",
    "name_new": "Nhà Bè",
    "name_old": null,
    "region": "ngoai-thanh",
    "verified": false
  }
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
  'quan-2':
    'Khu vực ven sông và cửa ngõ phía Đông của TP.HCM, tập trung chung cư cao cấp như Thủ Thiêm, An Phú, Vinhomes. Nơi có nhiều dự án căn hộ mới nhất thành phố.',
  'thu-duc':
    'Khu vực phía Đông, gom Quận 2, Quận 9 và Quận Thủ Đức trước đây — khu tập trung dự án chung cư lớn nhất TP.HCM như Vinhomes, The Prive, Masteri Thảo Điền.',
  'quan-7':
    'Khu đô thị mới, tập trung trung tâm thương mại, trường ĐH Quốc Gia và nhiều khu chung cư cao cấp ven sông.',
  'binh-thanh':
    'Quận nội thành ven sông, tập trung cao ốc văn phòng, trung tâm thương mại và nhiều dự án căn hộ ven sông.',
  'go-vap':
    'Quận nội thành phía Bắc, tập trung dân cư đông đúc, nhiều dự án căn hộ giá tầm trung và nhiều trường học.',
  'tan-phu':
    'Quận nội thành phía Tây Nam, tập trung nghề may, có khu dân cư đông và nhiều dự án căn hộ giá vừa.',
  'quan-8':
    'Quận ven sông phía Tây Nam, nhiều khu dân cư và dự án căn hộ vừa và giá rẻ, kết nối thuận tiện với Quận 7.',
  'quan-12':
    'Quận nội thành phía Tây, tập trung dân cư đông, nhiều dự án căn hộ và đất nền giá vừa phải.',
  'tan-binh':
    'Quận trung tâm phía Tây, tập trung văn phòng, sân bay và nhiều chung cư cao cấp ven sông.',
  'phu-nhuan':
    'Quận nội thành nhỏ gọn, nhiều công viên, trường học uy tín và các dự án căn hộ giá tầm trung.',
};

export const findBySlug = (slug: string) => DISTRICTS.find((d) => d.slug === slug);
