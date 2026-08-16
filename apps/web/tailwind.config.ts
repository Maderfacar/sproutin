import type { Config } from 'tailwindcss';

// 溫暖親和 tokens。品牌色以 CSS 變數承載（runtime per-school，ADR-001）;
// 暖色中性 / 圓角 / 柔和陰影為固定基調。
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
