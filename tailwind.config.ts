import type { Config } from 'tailwindcss'
import { colors } from './src/theme/colors'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // 색 모듈의 키(container, outline 등)가 클래스로 오인되지 않도록 제외
    "!./src/theme/**",
  ],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['"Noto Sans KR"', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.125rem',    // 2px - very subtle
        DEFAULT: '0.375rem', // 6px - buttons/inputs
        md: '0.5rem',      // 8px - small cards
        lg: '0.75rem',     // 12px - cards
        xl: '1rem',        // 16px - large containers
        '2xl': '1.25rem',  // 20px - modals
        full: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config
