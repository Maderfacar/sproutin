import type { Config } from 'tailwindcss';

// 清葉加厚 tokens。品牌色以 CSS 變數承載（runtime per-school，ADR-001）;
// 米白中性 / 襯線標題 / 柔和留白為固定基調，「加厚」只改份量不改氣質。
//
// 這裡是 globals.css 那份 :root 的 Tailwind 對照表 —— 兩邊必須一起改。
// 顏色一律指向變數而非寫死色碼，園所換品牌色時整站才會跟著換。
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 加厚後最小字級停在 11px（2xs）。原本的 3xs（10px）與 4xs（9px）已移除
      // —— 家長多半是長輩，那個尺寸在戶外根本看不見，而底部頁籤、徽章這些用它的地方
      // 本來就該大一點（Human Owner 2026-08-20）。
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.9375rem' }], // 11px
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
          wash: 'var(--brand-wash)',
        },
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          sunk: 'var(--surface-sunk)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          mute: 'var(--ink-mute)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        // 狀態語意色（全園固定，不隨品牌變）。三個一組：wash 底 / edge 邊 / text 字。
        good: { wash: 'var(--good-wash)', edge: 'var(--good-edge)', text: 'var(--good-text)' },
        wait: { wash: 'var(--wait-wash)', edge: 'var(--wait-edge)', text: 'var(--wait-text)' },
        note: { wash: 'var(--note-wash)', edge: 'var(--note-edge)', text: 'var(--note-text)' },
        stop: { wash: 'var(--stop-wash)', edge: 'var(--stop-edge)', text: 'var(--stop-text)' },
      },
      borderRadius: {
        tile: 'var(--radius-tile)',
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
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
      // 觸控下限。可點的東西一律 min-h-touch，44px 是 Apple/Google 兩邊都建議的數字。
      minHeight: {
        touch: '2.75rem',
      },
      minWidth: {
        touch: '2.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
