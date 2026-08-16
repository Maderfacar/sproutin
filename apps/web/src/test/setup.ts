import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// globals:false → RTL 不會自動註冊 afterEach cleanup,手動註冊避免測試間 DOM 殘留。
afterEach(() => {
  cleanup();
});
