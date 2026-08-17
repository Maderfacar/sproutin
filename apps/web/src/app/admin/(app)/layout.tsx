'use client';

import type { ReactNode } from 'react';
import { AdminSessionProvider } from '../../../lib/adminSession';
import { AdminShell } from '../../../components/AdminShell';

// 需要身分的後台頁面共用這一層：先確認 session，再套桌面外框。
export default function AdminAppLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSessionProvider>
  );
}
