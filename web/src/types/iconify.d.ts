/**
 * Khai báo kiểu cho phần tử <iconify-icon> của Iconify.
 *
 * Iconify tự đăng ký phần tử tuỳ biến ở runtime (custom element),
 * nên TypeScript không biết tới. File này khai báo lại để JSX không báo lỗi.
 *
 * ⚠ React 19 đã bỏ namespace JSX toàn cục — phải khai báo trong React.JSX,
 *   không phải JSX.IntrinsicElements, nếu không TypeScript sẽ không nhận diện.
 */

import type { DetailedHTMLProps, HTMLAttributes } from 'react';

interface IconifyIconProps extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  /** tên icon theo dạng "bộ:icon", ví dụ "lucide:building-2" */
  icon?: string;
  width?: string | number;
  height?: string | number;
  flip?: string;
  rotate?: string | number;
  inline?: boolean;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': IconifyIconProps;
    }
  }
}

export {};