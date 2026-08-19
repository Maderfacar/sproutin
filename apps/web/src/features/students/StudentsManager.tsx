'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { apiErrorMessage } from '../../lib/api';
import type { AdminStudentView, StudentStatus } from '../../lib/types';
import { StatusScreen } from '../../components/StatusScreen';
import { SurfaceLink } from '../../components/SurfaceLink';
import { Icon } from '../../components/Icon';
import { useMyClasses } from '../classes/hooks';
import {
  STUDENT_STATUS_LABEL,
  useAdminStudents,
  useCreateStudent,
  useUpdateStudent,
} from './adminHooks';
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

const STATUS_OPTIONS: StudentStatus[] = ['ACTIVE', 'INACTIVE', 'GRADUATED'];

const STATUS_TONE: Record<StudentStatus, 'good' | 'neutral' | 'wait'> = {
  ACTIVE: 'good',
  INACTIVE: 'neutral',
  GRADUATED: 'wait',
};

// 學生管理（OWNER/ADMIN）：新增、改名、換班、改在學狀態。
// 「只停用不刪除」：畢業/離校改狀態，資料留著（出缺勤、請假、訊息等歷史需要它）。
//
// 桌面版 /admin/students 與手機版 /liff/admin/students 共用這一份（docs/04 §3b）。
// 頁內連結走 SurfaceLink —— 在桌面後台點學生會留在桌面後台，不會被丟進手機版版型。
//
// **這一頁是「清單頁」版型的樣板**（清葉加厚，2026-08-20）：
//   篩選在最上面（少量攤開、多了收進面板）→ 一份名單 → 新增與編輯都在底部面板裡。
// 表單不攤在頁面上：管理頁多數時候是來「找一個人看一眼」，不是來填表的；
// 把新增表單常駐在最上面，等於每次進來都要先捲過它。
export function StudentsManager() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: classes } = useMyClasses();
  const [filterClassId, setFilterClassId] = useState<string>('');
  const { data: students, isLoading, isError, error, refetch } = useAdminStudents(
    filterClassId || undefined,
  );
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const [newName, setNewName] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newError, setNewError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<AdminStudentView | null>(null);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以管理學生。" />;
  }
  if (isLoading) {
    return <SkeletonRows rows={6} />;
  }
  if (isError || !students) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const className = (id: string): string => classes?.find((c) => c.id === id)?.name ?? '未分班';
  const busy = createStudent.isPending || updateStudent.isPending;
  const actionError = createStudent.error ?? updateStudent.error ?? null;
  const hasClasses = (classes?.length ?? 0) > 0;
  const filterLabel = filterClassId ? className(filterClassId) : '全部班級';

  const submitNew = (): void => {
    const name = newName.trim();
    const classId = newClassId || classes?.[0]?.id;
    if (!name) {
      setNewError('請填學生姓名。');
      return;
    }
    if (!classId) {
      setNewError('請先建立至少一個班級。');
      return;
    }
    createStudent.mutate(
      { name, classId },
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
      {!hasClasses ? (
        <EmptyState
          title="還沒有任何班級"
          hint="學生必須先有班可以進"
          action={
            <SurfaceLink
              href="/liff/admin/classes"
              className="tappable inline-flex min-h-touch items-center rounded-md2 bg-brand-primary px-5 font-semibold text-white shadow-soft"
            >
              先去建立班級
            </SurfaceLink>
          }
        />
      ) : (
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Icon name="user" className="h-5 w-5" />
          新增學生
        </Button>
      )}

      {actionError && <ErrorNotice message={apiErrorMessage(actionError)} />}

      <section>
        <SectionHead
          title={`目前的學生（${students.length}）`}
          description="點名字看他的整合視圖；點「編輯」可以改班級與在學狀態"
          weight="review"
          trailing={
            // 班級少的時候直接攤開比較快；多了就收進面板，硬擠成一排比下拉更糟。
            classes && classes.length > 3 ? (
              <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                {filterLabel}
                <Icon name="chev" className="h-4 w-4 rotate-90" />
              </Button>
            ) : undefined
          }
        />

        {classes && classes.length > 0 && classes.length <= 3 && (
          <div className="mb-3">
            <Segmented
              label="依班級篩選"
              options={[
                { value: '', label: '全部' },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={filterClassId}
              onChange={setFilterClassId}
            />
          </div>
        )}

        {students.length === 0 ? (
          <EmptyState
            title={filterClassId ? '這個班還沒有學生' : '還沒有學生'}
            hint="按上面那顆按鈕就可以新增"
          />
        ) : (
          <ul>
            {students.map((student) => (
              <li key={student.id}>
                <Row
                  lead={<Avatar name={student.name} />}
                  title={
                    <SurfaceLink href={`/liff/student/${student.id}`} className="tappable block">
                      {student.name}
                    </SurfaceLink>
                  }
                  detail={className(student.classId)}
                  trailing={
                    <span className="flex shrink-0 items-center gap-2">
                      {student.status !== 'ACTIVE' && (
                        <Badge tone={STATUS_TONE[student.status]}>
                          {STUDENT_STATUS_LABEL[student.status]}
                        </Badge>
                      )}
                      <button
                        type="button"
                        aria-label={`編輯 ${student.name}`}
                        onClick={() => setEditing(student)}
                        className="tappable min-h-touch rounded-md2 border border-line-strong px-3 text-2xs font-semibold text-ink"
                      >
                        編輯
                      </button>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        學生不會被刪除。畢業或離校請改「在學狀態」，出缺勤與請假等歷史紀錄才不會斷掉。
      </p>

      {/* 新增：短任務，從底部滑上來，做完就回到名單。 */}
      <Sheet open={createOpen} title="新增學生" onClose={() => setCreateOpen(false)}>
        <div className="flex flex-col gap-4">
          <Field label="姓名" error={newError ?? undefined}>
            <input
              type="text"
              value={newName}
              maxLength={40}
              placeholder="例如：陳小宇"
              onChange={(e) => {
                setNewName(e.target.value);
                if (newError) setNewError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitNew()}
              className="field"
            />
          </Field>
          <Field label="進哪一班">
            <select
              aria-label="班級"
              value={newClassId || classes?.[0]?.id || ''}
              onChange={(e) => setNewClassId(e.target.value)}
              className="field"
            >
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Button variant="primary" onClick={submitNew} disabled={busy}>
            {createStudent.isPending ? '新增中…' : '新增'}
          </Button>
        </div>
      </Sheet>

      {/* 編輯：key 帶 id，換人時整組狀態重來（與人員管理同一條理由）。 */}
      {editing && (
        <Sheet
          key={editing.id}
          open
          title={`編輯 ${editing.name}`}
          onClose={() => setEditing(null)}
        >
          <div className="flex flex-col gap-4">
            <Field label="姓名">
              <input
                type="text"
                value={editing.name}
                maxLength={40}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="field"
              />
            </Field>
            <Field label="班級">
              <select
                aria-label="班級"
                value={editing.classId}
                onChange={(e) => setEditing({ ...editing, classId: e.target.value })}
                className="field"
              >
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="在學狀態" hint="畢業或離校改這裡，不要刪除學生">
              <select
                aria-label="在學狀態"
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as StudentStatus })}
                className="field"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STUDENT_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              variant="primary"
              disabled={busy || editing.name.trim().length === 0}
              onClick={() =>
                updateStudent.mutate(
                  {
                    id: editing.id,
                    patch: {
                      name: editing.name.trim(),
                      classId: editing.classId,
                      status: editing.status,
                    },
                  },
                  { onSuccess: () => setEditing(null) },
                )
              }
            >
              {updateStudent.isPending ? '儲存中…' : '儲存'}
            </Button>
          </div>
        </Sheet>
      )}

      {/* 班級多的時候用面板篩選。 */}
      <Sheet open={filterOpen} title="看哪一個班" onClose={() => setFilterOpen(false)}>
        <ul className="flex flex-col gap-2">
          {[{ id: '', name: '全部班級' }, ...(classes ?? [])].map((c) => (
            <li key={c.id || 'all'}>
              <button
                type="button"
                onClick={() => {
                  setFilterClassId(c.id);
                  setFilterOpen(false);
                }}
                aria-current={c.id === filterClassId ? 'true' : undefined}
                className={`tappable flex min-h-touch w-full items-center rounded-md2 border px-4 py-3 text-left text-base font-bold ${
                  c.id === filterClassId
                    ? 'border-brand-primary bg-brand-wash text-brand-primary'
                    : 'border-line-strong bg-surface text-ink'
                }`}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
