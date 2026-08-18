import type { Config } from 'tailwindcss';

// 清葉 tokens。品牌色以 CSS 變數承載（runtime per-school，ADR-001）;
// 米白中性 / 襯線標題 / 細線 / 柔和留白為固定基調。
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 補上比 text-xs 更小的三級。原本這些地方寫死 `text-[10px]` 之類的 px，
      // 改 html font-size 放大全站時它們不會跟著長大，大小字的比例會走鐘（見 lib/fontScale）。
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.9375rem' }], // 11px
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        '4xs': ['0.5625rem', { lineHeight: '0.75rem' }], // 9px
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
      },
      colors: {
        brand: {
          DEFAULT: 'var(--brand-primary)',
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
        },
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
        },
        line: 'var(--line)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        md2: 'var(--radius-md)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        lift: 'var(--shadow-lift)',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
