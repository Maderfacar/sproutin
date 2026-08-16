import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 前端單元/元件測試（Phase 8）。jsdom + React Testing Library。
// 測試檔明確 import { describe, it, expect } from 'vitest'（globals:false，與 eslint 不衝突）。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
