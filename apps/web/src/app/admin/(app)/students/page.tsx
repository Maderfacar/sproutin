'use client';

import { StudentsManager } from '../../../../features/students/StudentsManager';

// 桌面版學生管理。與手機版 /liff/admin/students 共用 StudentsManager ——
// **功能不因裝置而不同，差別只有外框**（原則見 docs/04 §3b）。
export default function AdminStudentsPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">學生管理</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          新增學生、調整班級與在學狀態。點名字可以看這個孩子的整合資料
          （家長、出缺勤、娃娃車接送點）。
        </p>
      </header>
      <StudentsManager />
    </div>
  );
}
