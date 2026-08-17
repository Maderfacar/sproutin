'use client';

import { AuditPanel } from '../../../../features/audit/AuditPanel';

// 桌面版稽核查詢。與手機版 /liff/audit 共用 AuditPanel（docs/04 §3b）。
export default function AdminAuditPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">稽核紀錄</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          誰在什麼時候做了什麼。紀錄只能新增不能修改或刪除 ——
          有爭議時，這裡是唯一說得清楚的地方。
        </p>
      </header>
      <AuditPanel />
    </div>
  );
}
