'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { apiErrorMessage } from '../../lib/api';
import { ROLE_LABEL } from '../../lib/roleLabels';
import type { UserRoleName } from '../../lib/types';
import { StatusScreen } from '../../components/StatusScreen';
import { usePeople } from './hooks';
import { PersonEditor } from './PersonEditor';
import { useMyClasses } from '../classes/hooks';
import { useAdminStudents } from '../students/adminHooks';
import { SkeletonRows } from '../../components/Skeleton';
import { Band } from '../../components/Band';

const COLUMNS: UserRoleName[] = ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN'];

// 權限總覽：一頁看完「誰有什麼身分」。
// 與「人員與綁定」的差別是視角 —— 那一頁一次看一個人，這一頁一次看全部人的權限分布，
// 適合定期檢查有沒有人拿到不該有的權限（例如離職老師忘了處理）。
// 調整權限仍走同一個 PersonEditor，不另做一套操作介面。
//
// 桌面版 /admin/roles 與手機版 /liff/admin/roles 共用這一份（docs/04 §3b）。
// 表格在手機上放不下 —— 外層 overflow-x-auto 讓它自己橫向捲動，不另做一套窄版排版：
// 兩套排版就是兩份要維護的東西，而這張表的重點（誰有哪幾個點）橫捲一樣看得到。
export function RolesOverview() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: people, isLoading, isError, error } = usePeople();
  const { data: classes } = useMyClasses();
  const { data: students } = useAdminStudents();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以檢視權限設定。" />;
  }
  if (isLoading) {
    return <SkeletonRows rows={5} />;
  }
  if (isError || !people) {
    return <StatusScreen status="error" message={apiErrorMessage(error)} />;
  }

  const editing = people.find((p) => p.id === editingId) ?? null;
  const active = people.filter((p) => p.status === 'ACTIVE');
  const inactive = people.filter((p) => p.status !== 'ACTIVE');

  return (
    <div>
      <Band
        kind="review"
        title="誰有什麼身分"
        description="一列一個人，圓點就是他有的身分。橫向可以捲，右邊的「調整」可以改"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-3 text-left font-semibold text-ink">姓名</th>
                {COLUMNS.map((role) => (
                  <th key={role} className="px-2 py-2 text-center text-xs font-semibold text-ink-soft">
                    {ROLE_LABEL[role] ?? role}
                  </th>
                ))}
                <th className="py-2 pl-3" />
              </tr>
            </thead>
            <tbody>
              {[...active, ...inactive].map((person) => {
                const held = new Set(person.roles.map((r) => r.role));
                const isActive = person.status === 'ACTIVE';
                return (
                  <tr key={person.id} className="border-b border-line">
                    <td className={`py-2.5 pr-3 ${isActive ? 'text-ink' : 'text-ink-soft'}`}>
                      {person.displayName}
                      {!isActive && <span className="ml-2 text-xs">已停用</span>}
                      {!person.hasLineLinked && isActive && (
                        <span className="ml-2 text-xs text-ink-soft">未綁定</span>
                      )}
                    </td>
                    {COLUMNS.map((role) => (
                      <td key={role} className="px-2 py-2.5 text-center">
                        {held.has(role) ? (
                          <span
                            aria-label={`有${ROLE_LABEL[role] ?? role}身分`}
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: 'var(--brand-primary)' }}
                          />
                        ) : (
                          <span className="text-ink-soft/40" aria-hidden>
                            ·
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="py-2.5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingId(person.id === editingId ? null : person.id)}
                        className="btn-secondary text-xs"
                      >
                        調整
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Band>

      {editing && (
        <div className="mb-7">
          <PersonEditor
            person={editing}
            classes={classes ?? []}
            students={students ?? []}
            onClose={() => setEditingId(null)}
          />
        </div>
      )}

      <p className="border-t border-line pt-5 text-xs leading-relaxed text-ink-soft">
        移除身分會連帶解除該身分附帶的關聯（不再是老師就不會留在班上），避免留下沒有意義的權限。
        每個人至少要保留一個身分；離職或退園請用「停用帳號」，帳號與歷史紀錄都會留著。
      </p>
    </div>
  );
}
