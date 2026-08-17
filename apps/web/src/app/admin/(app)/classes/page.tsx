'use client';

import { ClassesManager } from '../../../../features/classes/ClassesManager';

// 桌面版班級管理。與手機版 /liff/admin/classes 共用 ClassesManager ——
// **功能不因裝置而不同，差別只有外框**（原則見 docs/04 §3b）。
export default function AdminClassesPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">班級管理</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          新增班級、改名，或刪除還沒用到的空班。學生、老師編制、出缺勤與請假都掛在班級之下，
          所以只要班上還有人就刪不掉。
        </p>
      </header>
      <ClassesManager />
    </div>
  );
}
