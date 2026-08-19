'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { apiErrorMessage } from '../../lib/api';
import { ROLE_LABEL } from '../../lib/roleLabels';
import type { UserRoleName, UserView } from '../../lib/types';
import { StatusScreen } from '../../components/StatusScreen';
import { Icon } from '../../components/Icon';
import { useMyClasses } from '../classes/hooks';
import { useAdminStudents } from '../students/adminHooks';
import { peopleErrorMessage, useCreatePerson, usePeople } from './hooks';
import { PersonEditor } from './PersonEditor';
import { SkeletonRows } from '../../components/Skeleton';
import { Band } from '../../components/Band';

// 可新增的身分（園長不從這裡新增 —— 交接園長屬敏感操作，demo 階段先不開放）。
const CREATABLE_ROLES: UserRoleName[] = ['TEACHER', 'BUS_TEACHER', 'ADMIN', 'PARENT', 'GUARDIAN'];

const TABS: { key: 'all' | 'staff' | 'family'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'staff', label: '教職員' },
  { key: 'family', label: '家長' },
];

function isStaff(person: UserView): boolean {
  return person.roles.some((r) =>
    ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER'].includes(r.role),
  );
}

function isFamily(person: UserView): boolean {
  return person.roles.some((r) => ['PARENT', 'GUARDIAN'].includes(r.role));
}

// 人員帳號管理（OWNER/ADMIN）：新增老師/行政/家長帳號，指派任教班級、綁定小孩，停用帳號。
// 帳號沒有刪除 —— 停用即無法登入，但歷史紀錄（請假、訊息、稽核）仍留有歸屬。
//
// 這是「同一份功能、兩種外框」的第一個例子：手機版 /liff/admin/people 與桌面版 /admin/people
// 都是這個元件，只有頁面標題與外框不同，功能與授權完全不分岔。
export function PeopleManager() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: people, isLoading, isError, error } = usePeople();
  const { data: classes } = useMyClasses();
  const { data: students } = useAdminStudents();
  const createPerson = useCreatePerson();

  const [tab, setTab] = useState<'all' | 'staff' | 'family'>('all');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRoleName>('TEACHER');
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以管理人員帳號。" />;
  }
  if (isLoading) {
    return <SkeletonRows rows={6} />;
  }
  if (isError || !people) {
    return <StatusScreen status="error" message={apiErrorMessage(error)} />;
  }

  const visible = people.filter((p) =>
    tab === 'staff' ? isStaff(p) : tab === 'family' ? isFamily(p) : true,
  );
  const editing = people.find((p) => p.id === editingId) ?? null;

  const submitNew = (): void => {
    const displayName = newName.trim();
    if (!displayName) return;
    createPerson.mutate({ displayName, role: newRole }, { onSuccess: () => setNewName('') });
  };

  return (
    <div>
      <Band
        kind="manage"
        title="新增人員"
        description="打好姓名、選一個身分就建立得了；建立完再給他一組綁定碼"
      >
        <section className="rise-in card p-5">
          <div className="space-y-2 md:flex md:items-start md:gap-2 md:space-y-0">
            <input
              type="text"
              value={newName}
              maxLength={40}
              placeholder="姓名（例如：林老師、張媽媽）"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNew()}
              className="field md:flex-1"
            />
            <div className="flex gap-2 md:shrink-0">
              <select
                aria-label="身分"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRoleName)}
                className="field md:w-36"
              >
                {CREATABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={submitNew}
                disabled={createPerson.isPending || newName.trim().length === 0}
                className="btn-primary shrink-0 text-sm"
              >
                新增
              </button>
            </div>
          </div>
          {createPerson.isError && (
            <p className="mt-2 text-sm text-red-700">
              {peopleErrorMessage(createPerson.error, apiErrorMessage(createPerson.error))}
            </p>
          )}
        </section>
      </Band>

      <Band
        kind="review"
        title="目前的人員"
        description="用上面的標籤切換教職員或家長；點「編輯」可以改身分、班級與綁定"
      >
        <section className="rise-in" style={{ animationDelay: '0.05s' }}>
          <div className="mb-3 flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`chip border transition ${
                  tab === t.key
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-line text-ink-soft hover:border-brand-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="border-t border-line py-6 text-center text-sm text-ink-soft">
              這個範圍還沒有人員。
            </p>
          ) : (
            <ul className="border-t border-line">
              {visible.map((person) => {
                const summary =
                  person.teaching.map((t) => t.className).join('、') ||
                  person.guardianOf.map((g) => g.studentName).join('、');
                return (
                  <li key={person.id} className="flex items-center gap-3 border-b border-line py-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                        person.status === 'ACTIVE' ? '' : 'opacity-40'
                      }`}
                      style={{ background: 'var(--brand-primary)' }}
                      aria-hidden
                    >
                      {person.displayName.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {person.displayName}
                        {person.status !== 'ACTIVE' && (
                          <span className="ml-2 text-xs font-normal text-ink-soft">已停用</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        {person.roles.map((r) => ROLE_LABEL[r.role] ?? r.role).join(' · ')}
                        {summary && ` · ${summary}`}
                      </p>
                    </div>
                    {!person.hasLineLinked && (
                      <span
                        title="尚未綁定 LINE，本人還無法登入"
                        className="chip shrink-0 border border-line text-ink-soft"
                      >
                        未綁定
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`編輯 ${person.displayName}`}
                      onClick={() => setEditingId(person.id === editingId ? null : person.id)}
                      className="btn-secondary shrink-0 text-xs"
                    >
                      編輯
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Band>

      {editing && (
        <div className="mb-7">
          {/* key 一定要帶 person.id：沒關掉面板就直接點另一個人的「編輯」時，
              React 會沿用同一個元件實例，於是姓名欄、選到的小孩、選到的班級
              全部留在上一個人身上（Human Owner 2026-08-20 回報：內容換了但名字還是前一位）。
              換人＝換一個編輯對象，本地狀態本來就該整組重來。 */}
          <PersonEditor
            key={editing.id}
            person={editing}
            classes={classes ?? []}
            students={students ?? []}
            onClose={() => setEditingId(null)}
          />
        </div>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        帳號不會被刪除，離職或退園請用「停用」。停用後無法登入，但他過去建立的請假、訊息與稽核紀錄仍完整保留。
      </p>
    </div>
  );
}
