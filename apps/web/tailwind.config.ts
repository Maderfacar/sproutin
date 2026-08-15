import type { Config } from 'tailwindcss';

// 品牌色以 CSS 變數承載（--brand-primary / --brand-secondary），由 BrandingProvider 於
// runtime 依 /config/public 注入（ADR-001，bundle 不含 per-school 值）。Tailwind 只引用變數。
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
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};

export default config;
