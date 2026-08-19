// ESLint 9 flat config（monorepo 統一;清 tech debt「ESLint flat config」，Phase 8）。
// 範圍：apps/api（NestJS TS）、apps/web（Next.js React TSX）、packages/shared（TS）。
// 策略：JS + typescript-eslint recommended（非 type-checked,快）；web 另加 react-hooks + Next 規則。
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

// 設計系統的守門（清葉加厚，2026-08-20）。
//
// 為什麼要有這個 plugin：docs/04 §3c 把規則寫得很清楚，但**規則沒有執行者就會慢慢鬆掉**
// —— 下一個人（或下一個視窗的我）加新頁面時，最省事的作法永遠是複製一段舊的 class。
// 這三條擋的都是「已經全站清乾淨、不該再出現」的東西，所以只有真的走回頭路時才會亮。
//
// 寫成 plugin 而不是 no-restricted-syntax 的選擇器，是因為選擇器裡的 `/(^|\s)…/`
// 會先被 JS 字串跳脫吃掉一層（`\s` 變成 `s`），規則看起來設好了其實從來沒擋住任何東西
// —— 一個永遠不會亮的守門比沒有守門更危險。
const RETIRED = [
  {
    // 已刪除的全域 class（globals.css 只剩 .field 與 .tappable）。
    test: /(^|\s)(card|btn-primary|btn-secondary|field-label|section-title|eyebrow|chip)(\s|$)/,
    message:
      '這幾個全域 class 已刪除，改用 components/ui 的元件：card→Tile、btn-*→Button、field-label→Field、section-title/eyebrow→SectionHead、chip→Badge。',
  },
  {
    // Tailwind 預設色。狀態色全園固定且與米白森綠同調，一律走 good/wait/note/stop
    // （components/ui/tone.ts）；品牌色走 brand-*；中性走 ink/line/surface。
    test: /(^|\s|:)(bg|text|border|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}(\s|$)/,
    message:
      'Tailwind 預設色與清葉調性不同，園所換品牌色時也不會跟著協調。狀態用 good/wait/note/stop，品牌用 brand-*，中性用 ink/line/surface。',
  },
  {
    // 第一批移除的字級：家長多半是長輩，10px / 9px 在戶外看不見。
    test: /(^|\s)text-(3xs|4xs)(\s|$)/,
    message: '最小字級停在 11px（text-2xs）。text-3xs / text-4xs 已於第一批移除。',
  },
];

const designSystem = {
  rules: {
    'no-retired-styles': {
      meta: { type: 'problem', schema: [] },
      create(context) {
        const check = (node, value) => {
          if (typeof value !== 'string') return;
          for (const rule of RETIRED) {
            if (rule.test.test(value)) {
              context.report({ node, message: rule.message });
              return;
            }
          }
        };
        return {
          Literal: (node) => check(node, node.value),
          TemplateElement: (node) => check(node, node.value.raw),
        };
      },
    },
  },
};

export default tseslint.config(
  // 忽略建置產物 / 生成物 / 設定檔本身。
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.config.{js,cjs,mjs,ts}',
      '**/next-env.d.ts',
      'packages/db/prisma/**', // seed/verify 為一次性腳本,獨立於 app lint
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 全域 language options（Node + 瀏覽器 + ES2022）+ 共用規則微調。
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // `_` 前綴＝刻意未使用（既有慣例:mock 參數 _to/_text、解構 _a）。
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // 生產碼禁 console（coding-style）;entrypoint（main/worker）boot log 已就地 disable。
      'no-console': 'error',
    },
  },

  // 測試檔:加入 jest 全域（no-explicit-any 保持啟用,既有 spec 皆已就地 disable）。
  {
    files: ['**/*.spec.ts', '**/e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.jest } },
  },

  // 前端（Next.js）：React Hooks + Next 規則 + 設計系統的守門。
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, '@next/next': nextPlugin, 'design-system': designSystem },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      'design-system/no-retired-styles': 'error',
    },
  },

  // 元件庫本身是那些規則的定義處，不受它們約束（tone.ts 就是狀態色的對照表）。
  {
    files: ['apps/web/src/components/ui/**', 'apps/web/**/*.spec.tsx'],
    rules: { 'design-system/no-retired-styles': 'off' },
  },
);
