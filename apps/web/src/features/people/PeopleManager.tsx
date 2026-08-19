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
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  Row,
  SectionHead,
  Segmented,
  Sheet,
  SkeletonRows,
} from '../../components/ui';

// 可新增的身分（園長不從這裡新增 —— 交接園長屬敏感操作，demo 階段先不開放）。
const CREATABLE_ROLES: UserRoleName[] = ['TEACHER', 'BUS_TEACHER', 'ADMIN', 'PARENT', 'GUARDIAN'];

const TABS = [
  { value: 'all', label: '全部' },
  { value: 'staff', label: '教職員' },
  { value: 'family', label: '家長' },
] as const;

type Tab = (typeof TABS)[number]['value'];

function isStaff(person: UserView): boolean {
  return person.roles.some((r) => ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER'].includes(r.role));
}

function isFamily(person: UserView): boolean {
  return person.roles.some((r) => ['PARENT', 'GUARDIAN'].includes(r.role));
}

// 人員帳號管理（OWNER/ADMIN）：新增老師/行政/家長帳號，指派任教班級、綁定小孩，停用帳號。
// 帳號沒有刪除 —— 停用即無法登入，但歷史紀錄（請假、訊息、稽核）仍留有歸屬。
//
// 這是「同一份功能、兩種外框」的第一個例子：手機版 /liff/admin/people 與桌面版 /admin/people
// 都是這個元件，只有頁面標題與外框不同，功能與授權完全不分岔。
//
// 清葉加厚（2026-08-20）：照「清單頁」版型 —— 新增收進底部面板，頁面主體是一份名單。
// 編輯面板刻意**留在頁面上而不是收進 Sheet**：它裡面有身分、班級、綁定小孩、LINE 綁定
// 四段，塞進一個 70vh 的面板會變成面板裡再捲一層，比留在頁面上更難用。
export function PeopleManager() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: people, isLoading, isError, error, refetch } = usePeople();
  const { data: classes } = useMyClasses();
  const { data: students } = useAdminStudents();
  const createPerson = useCreatePerson();

  const [tab, setTab] = useState<Tab>('all');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRoleName>('TEACHER');
  const [newError, setNewError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以管理人員帳號。" />;
  }
  if (isLoading) {
    return <SkeletonRows rows={6} />;
  }
  if (isError || !people) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const visible = people.filter((p) =>
    tab === 'staff' ? isStaff(p) : tab === 'family' ? isFamily(p) : true,
  );
  const editing = people.find((p) => p.id === editingId) ?? null;

  const submitNew = (): void => {
    const displayName = newName.trim();
    if (!displayName) {
      setNewError('請填姓名。');
      return;
    }
    createPerson.mutate(
      { displayName, role: newRole },
      {
        onSuccess: () => {
          setNewName('');
          setNewError(null);
          setCreateOpen(false);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        <Icon name="user" className="h-5 w-5" />
        新增人員
      </Button>

      {createPerson.isError && (
        <ErrorNotice
          message={peopleErrorMessage(createPerson.error, apiErrorMessage(createPerson.error))}
        />
      )}

      <section>
        <SectionHead
          title={`目前的人員（${visible.length}）`}
          description="點「編輯」可以改身分、帶班、綁定小孩與 LINE 綁定"
          weight="review"
        />

        <div className="mb-3">
          <Segmented label="篩選人員" options={TABS} value={tab} onChange={setTab} />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title={tab === 'all' ? '還沒有任何人員' : '這個範圍還沒有人'}
            hint="按上面那顆按鈕就可以新增"
          />
        ) : (
          <ul>
            {visible.map((person) => {
              const summary =
                person.teaching.map((t) => t.className).join('、') ||
                person.guardianOf.map((g) => g.studentName).join('、');
              return (
                <li key={person.id}>
                  <Row
                    lead={<Avatar name={person.displayName} />}
                    title={person.displayName}
                    detail={
                      person.roles.map((r) => ROLE_LABEL[r.role] ?? r.role).join(' · ') +
                      (summary ? ` · ${summary}` : '')
                    }
                    trailing={
                      <span className="flex shrink-0 items-center gap-2">
                        {person.status !== 'ACTIVE' && <Badge tone="neutral">已停用</Badge>}
                        {!person.hasLineLinked && person.status === 'ACTIVE' && (
                          <Badge tone="wait">未綁定</Badge>
                        )}
                        <button
                          type="button"
                          aria-label={`編輯 ${person.displayName}`}
                          onClick={() => setEditingId(person.id === editingId ? null : person.id)}
                          className="tappable min-h-touch rounded-md2 border border-line-strong px-3 text-2xs font-semibold text-ink"
                        >
                          編輯
                        </button>
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {editing && (
        /* key 一定要帶 person.id：沒關掉面板就直接點另一個人的「編輯」時，
           React 會沿用同一個元件實例，於是姓名欄、選到的小孩、選到的班級
           全部留在上一個人身上（Human Owner 2026-08-20 回報：內容換了但名字還是前一位）。
           換人＝換一個編輯對象，本地狀態本來就該整組重來。 */
        <PersonEditor
          key={editing.id}
          person={editing}
          classes={classes ?? []}
          students={students ?? []}
          onClose={() => setEditingId(null)}
        />
      )}

      <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        帳號不會被刪除，離職或退園請用「停用」。停用後無法登入，但他過去建立的請假、訊息與稽核紀錄仍完整保留。
      </p>

      <Sheet open={createOpen} title="新增人員" onClose={() => setCreateOpen(false)}>
        <div className="flex flex-col gap-4">
          <Field label="姓名" error={newError ?? undefined}>
            <input
              type="text"
              value={newName}
              maxLength={40}
              placeholder="例如：林老師、張媽媽"
              onChange={(e) => {
                setNewName(e.target.value);
                if (newError) setNewError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitNew()}
              className="field"
            />
          </Field>
          <Field label="身分" hint="建立完再給他一組綁定碼，他才登得進來">
            <select
              aria-label="身分"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRoleName)}
              className="field"
            >
              {CREATABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </Field>
          <Button variant="primary" onClick={submitNew} disabled={createPerson.isPending}>
            {createPerson.isPending ? '新增中…' : '新增'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
