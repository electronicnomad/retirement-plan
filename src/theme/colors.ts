// 앱 전체 색상의 단일 원본.
// tailwind.config.ts(클래스용)와 AssetChart.tsx(Recharts용)가 모두 이 파일을 참조한다.
// 값을 바꾼 뒤에는 개발 서버를 재시작해야 Tailwind 클래스에 반영된다.
// 룩앤필 기준은 ../salary-calculator(styles.css의 :root 변수)이며, 두 앱의 통일성을 위해 값을 맞춘다.
// 차트 색(data, secondary, tertiary)을 바꿀 때는 색각 이상 검증을 다시 하고 DESIGN.md를 갱신할 것.
export const colors = {
  // Surfaces (cool neutral grays)
  surface: {
    DEFAULT: '#f4f5f7',
    dim: '#e9ebee',
    bright: '#ffffff',
    container: {
      lowest: '#ffffff',
      low: '#f9fafb',
      DEFAULT: '#f4f5f7',
      high: '#e9ebee',
      highest: '#d1d5db',
    },
  },
  'on-surface': {
    DEFAULT: '#1f2328',
    variant: '#6b7280',
  },
  'inverse-surface': '#1f2328',
  'inverse-on-surface': '#f4f5f7',

  // Primary (Accent Blue): container는 강조 요약 칸의 옅은 배경
  primary: {
    DEFAULT: '#2563eb',
    container: '#eaf1ff',
    fixed: '#eaf1ff',
    'fixed-dim': '#bfd3fe',
  },
  'on-primary': {
    DEFAULT: '#ffffff',
    container: '#1d4ed8',
    fixed: '#1e3a8a',
    'fixed-variant': '#1d4ed8',
  },

  // 차트 주 데이터 색 (salary-calculator의 실수령액 막대와 같은 강조색)
  data: '#2563eb',

  // Secondary (Deduction Orange): 공제·지출 금액
  secondary: {
    DEFAULT: '#f97316',
    container: '#fb923c',
    fixed: '#ffedd5',
    'fixed-dim': '#fdba74',
  },
  'on-secondary': {
    DEFAULT: '#ffffff',
    container: '#ffffff',
    fixed: '#7c2d12',
    'fixed-variant': '#c2410c',
  },

  // Tertiary (Muted Teal)
  tertiary: {
    DEFAULT: '#0d9488',
    container: '#14b8a6',
    fixed: '#ccfbf1',
    'fixed-dim': '#5eead4',
  },
  'on-tertiary': {
    DEFAULT: '#ffffff',
    container: '#ffffff',
    fixed: '#134e4a',
    'fixed-variant': '#0f766e',
  },

  // Error
  error: {
    DEFAULT: '#dc2626',
    container: '#fecaca',
  },
  'on-error': {
    DEFAULT: '#ffffff',
    container: '#991b1b',
  },

  // Outlines
  outline: {
    DEFAULT: '#9ca3af',
    variant: '#e2e5e9',
  },

  // Success / Warning: DEFAULT는 글자색으로도 쓰이므로 흰 배경과 container 배경에서 4.5:1 이상 유지
  success: {
    DEFAULT: '#047857',
    container: '#d1fae5',
  },
  warning: {
    DEFAULT: '#b45309',
    container: '#fef3c7',
  },
}
