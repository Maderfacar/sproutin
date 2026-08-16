// ESLint 9 flat config（monorepo 統一;清 tech debt「ESLint flat config」，Phase 8）。
// 範圍：apps/api（NestJS TS）、apps/web（Next.js React TSX）、packages/shared（TS）。
// 策略：JS + typescript-eslint recommended（非 type-checked,快）；web 另加 react-hooks + Next 規則。
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

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

  // 前端（Next.js）：React Hooks + Next 規則。
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, '@next/next': nextPlugin },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
);
