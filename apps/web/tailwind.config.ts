import type { Config } from 'tailwindcss';

// 清葉 tokens。品牌色以 CSS 變數承載（runtime per-school，ADR-001）;
// 米白中性 / 襯線標題 / 細線 / 柔和留白為固定基調。
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
