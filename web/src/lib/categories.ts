/**
 * Danh mục nhà — dùng chung cho phím tắt trang chủ và bộ lọc trang tìm kiếm.
 *
 * ⚠ `slug` PHẢI khớp với hàm `nhomHinh` trong tools/build_27k.mjs.
 *   Đổi tên ở đây mà quên sửa kia → lọc ra 0 kết quả mà không có lỗi nào báo.
 *   Kiểm bằng: node tools/check_categories.mjs
 */
export interface CategoryDef {
  slug: string;
  name: string;
  icon: string;
}

export const CATEGORIES: CategoryDef[] = [
  { slug: 'chung-cu',  name: 'Căn hộ chung cư',      icon: 'lucide:building-2' },
  { slug: 'nha-pho',   name: 'Nhà phố, nhà hẻm',     icon: 'lucide:house' },
  { slug: 'mat-bang',  name: 'Mặt bằng kinh doanh', icon: 'lucide:store' },
  { slug: 'dat',       name: 'Đất',                 icon: 'lucide:land-plot' },
  { slug: 'biet-thu',  name: 'Biệt thự',            icon: 'lucide:castle' },
  { slug: 'shophouse', name: 'Shophouse',           icon: 'lucide:shopping-bag' },
  { slug: 'van-phong', name: 'Văn phòng, tòa nhà',  icon: 'lucide:briefcase' },
  { slug: 'khac',      name: 'Loại khác',           icon: 'lucide:shapes' },
];

export const CATEGORY_NAME: Record<string, string> =
  Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.name]));