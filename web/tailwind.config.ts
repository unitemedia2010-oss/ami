import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ================================================================
         *  DẠNG MÀU "HOẢNG LỮ" — vàng → cam → đỏ
         *
         *  Ba họ màu tạo nên gradient chuyển sắc tự nhiên:
         *    gold   → ánh nắng, điểm nhấn sáng
         *    amber  → cam ấm, màu chủ đạo
         *    flame  → đỏ dựng, sức nặng, CTA
         *  Mọi gradient đều đi qua cả ba nên không bị "loè" như gradient
         *  hai màu cơ bản.
         * ============================================================== */
        gold: {
          50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D',
          400: '#FBBF24', 500: '#F59E0B', 600: '#D97706', 700: '#B45309',
          800: '#92400E', 900: '#78350F',
        },
        amber: {
          50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74',
          400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C',
          800: '#9A3412', 900: '#7C2D12',
        },
        flame: {
          50: '#FFF1F2', 100: '#FFE4E6', 200: '#FECDD3', 300: '#FDA4AF',
          400: '#FB7185', 500: '#F43F5E', 600: '#E11D48', 700: '#BE123C',
          800: '#9F1239', 900: '#881337',
        },
        crimson: {
          50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5',
          400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C',
          800: '#991B1B', 900: '#7F1D1D',
        },

        /* Nền và chữ — trung tính ấm, hòa với tông nóng */
        cream: {
          50: '#FFFDFB', 100: '#FFF8F3', 200: '#FEF0E6',
          300: '#FCE5D6', 400: '#F8D5BE',
        },
        coal: {
          50: '#FAFAF9', 100: '#F5F5F4', 200: '#E7E5E4', 300: '#D6D3D1',
          400: '#A8A29E', 500: '#78716C', 600: '#57534E',
          700: '#44403C', 800: '#2A2523', 900: '#1C1917',
        },
      },

      /* --------------------------------------------------------------- font */
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Segoe UI', 'system-ui', 'sans-serif'],
      },

      /* ---------------------------------------------------------- gradients */
      backgroundImage: {
        /* Gradient chủ đạo — vàng → cam → đỏ */
        'grad-flame': 'linear-gradient(135deg, #FBBF24 0%, #F97316 45%, #E11D48 100%)',
        'grad-sunset': 'linear-gradient(135deg, #FDE68A 0%, #FB923C 50%, #EF4444 100%)',
        'grad-gold':  'linear-gradient(135deg, #FEF3C7 0%, #FBBF24 55%, #F97316 100%)',
        'grad-fire':  'linear-gradient(160deg, #F97316 0%, #E11D48 60%, #9F1239 100%)',
        /* Gradient chạy động — dùng cho viền và nền nổi */
        'grad-anim':  'linear-gradient(115deg,#FBBF24,#F97316,#E11D48,#FB923C,#FBBF24)',
        /* Ánh sáng dành cho nền tối */
        'glow-deep':  'radial-gradient(120% 80% at 50% 0%, #7C2D12 0%, #431407 45%, #1C1917 100%)',
      },

      backgroundSize: {
        'grad-anim': '300% 300%',
      },

      /* -------------------------------------------------------------- shadow */
      boxShadow: {
        /* Đổ bóng tông nóng thay vì xám — giữ sự ấm của thương hiệu */
        glow:      '0 0 0 1px rgba(249,115,22,.16), 0 8px 24px -6px rgba(249,115,22,.34)',
        'glow-lg': '0 0 0 1px rgba(249,115,22,.2), 0 18px 48px -12px rgba(225,29,72,.42)',
        'glow-red':'0 0 0 1px rgba(225,29,72,.2), 0 16px 40px -12px rgba(225,29,72,.5)',
        soft:      '0 2px 8px -2px rgba(120,53,15,.08), 0 1px 3px rgba(120,53,15,.06)',
        lift:      '0 18px 40px -14px rgba(120,53,15,.28)',
        glass:     '0 8px 32px -8px rgba(120,53,15,.22)',
      },

      /* -------------------------------------------------------------- motion */
      keyframes: {
        'grad-shift': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '50%':     { transform: 'translate(18px,-26px) scale(1.09)' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translate(0,0) scale(1.04)' },
          '50%':     { transform: 'translate(-24px,22px) scale(1)' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'rise': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%':   { boxShadow: '0 0 0 0 rgba(249,115,22,.5)' },
          '70%':  { boxShadow: '0 0 0 14px rgba(249,115,22,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(249,115,22,0)' },
        },
      },
      animation: {
        'grad':    'grad-shift 7s ease infinite',
        'float':   'float 15s ease-in-out infinite',
        'float-slow': 'float-slow 21s ease-in-out infinite',
        shimmer:  'shimmer 2.6s ease-in-out infinite',
        rise:     'rise .5s cubic-bezier(.16,1,.3,1) both',
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
      },

      /* ------------------------------------------------------------- spacing */
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
};

export default config;