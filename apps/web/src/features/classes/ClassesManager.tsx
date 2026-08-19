'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { apiErrorMessage } from '../../lib/api';
import { StatusScreen } from '../../components/StatusScreen';
import { Icon } from '../../components/Icon';
import {
  classErrorMessage,
  useCreateClass,
  useDeleteClass,
  useMyClasses,
  useRenameClass,
} from './hooks';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  Row,
  SectionHead,
  Sheet,
  SkeletonRows,
} from '../../components/ui';
import type { ClassView } from '../../lib/types';

// 班級管理（OWNER/ADMIN）：新增、改名、刪除空班。
// 刪除只在「沒有學生、沒有老師編制」時允許 —— 由後端把關，前端只負責把原因講清楚。
//
// 桌面版 /admin/classes 與手機版 /liff/admin/classes 共用這一份（docs/04 §3b）。
// 權限判斷刻意留在這裡而不是兩個外框裡：放在外框就有兩份，遲早會有一邊漏改。
//
// 清葉加厚（2026-08-20）：照「清單頁」版型 —— 新增與改名都收進底部面板；
// 刪除確認也是面板而不是就地長出兩顆按鈕（那會讓整列跳動，手指容易按到隔壁）。
export function ClassesManager() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: classes, isLoading, isError, error, refetch } = useMyClasses();
  const createClass = useCreateClass();
  const renameClass = useRenameClass();
  const deleteClass = useDeleteClass();

  const [newName, setNewName] = useState('');
  const [newError, setNewError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<ClassView | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [deleting, setDeleting] = useState<ClassView | null>(null);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以管理班級。" />;
  }
  if (isLoading) {
    return <SkeletonRows rows={4} />;
  }
  if (isError || !classes) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const busy = createClass.isPending || renameClass.isPending || deleteClass.isPending;
  const actionError = createClass.error ?? renameClass.error ?? deleteClass.error ?? null;

  const submitNew = (): void => {
    const name = newName.trim();
    if (!name) {
      setNewError('請填班級名稱。');
      return;
    }
    createClass.mutate(
      { name },
      {
        onSuccess: () => {
          setNewName('');
          setNewError(null);
          setCreateOpen(false);
        },
      },
    );
  };

  const submitRename = (): void => {
    if (!renaming) return;
    const name = renamingName.trim();
    if (!name) return;
    renameClass.mutate({ id: renaming.id, name }, { onSuccess: () => setRenaming(null) });
  };

  return (
    <div className="flex flex-col gap-5">
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        <Icon name="home" className="h-5 w-5" />
        新增班級
      </Button>

      {actionError && (
        <ErrorNotice message={classErrorMessage(actionError, apiErrorMessage(actionError))} />
      )}

      <section>
        <SectionHead
          title={`目前的班級（${classes.length}）`}
          description="班上還有學生或老師編制就刪不掉"
          weight="review"
        />

        {classes.length === 0 ? (
          <EmptyState title="還沒有任何班級" hint="按上面那顆按鈕建一個，例如「向日葵班」" />
        ) : (
          <ul>
            {classes.map((cls) => (
              <li key={cls.id}>
                <Row
                  title={cls.name}
                  detail={`${cls.studentCount} 位學生`}
                  trailing={
                    <span className="flex shrink-0 items-center gap-2">
                      {cls.studentCount > 0 && <Badge tone="neutral">有學生</Badge>}
                      <button
                        type="button"
                        aria-label={`修改 ${cls.name} 的名稱`}
                        onClick={() => {
                          setRenaming(cls);
                          setRenamingName(cls.name);
                        }}
                        className="tappable min-h-touch rounded-md2 border border-line-strong px-3 text-2xs font-semibold text-ink"
                      >
                        改名
                      </button>
                      <button
                        type="button"
                        aria-label={`刪除 ${cls.name}`}
                        onClick={() => setDeleting(cls)}
                        disabled={cls.studentCount > 0}
                        title={cls.studentCount > 0 ? '班上還有學生，不能刪除' : undefined}
                        className="tappable min-h-touch rounded-md2 border border-line px-3 text-2xs font-semibold text-ink-soft disabled:opacity-30"
                      >
                        刪除
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
        班級一旦有學生或老師編制就不能刪除，避免出缺勤、請假等歷史紀錄失去歸屬。
      </p>

      <Sheet open={createOpen} title="新增班級" onClose={() => setCreateOpen(false)}>
        <div className="flex flex-col gap-4">
          <Field label="班級名稱" error={newError ?? undefined} hint="園內不能重複">
            <input
              type="text"
              value={newName}
              maxLength={40}
              placeholder="例如：向日葵班"
              onChange={(e) => {
                setNewName(e.target.value);
                if (newError) setNewError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitNew()}
              className="field"
            />
          </Field>
          <Button variant="primary" onClick={submitNew} disabled={busy}>
            {createClass.isPending ? '新增中…' : '新增'}
          </Button>
        </div>
      </Sheet>

      {renaming && (
        <Sheet key={renaming.id} open title={`改「${renaming.name}」的名字`} onClose={() => setRenaming(null)}>
          <div className="flex flex-col gap-4">
            <Field label="新的名稱">
              <input
                type="text"
                value={renamingName}
                maxLength={40}
                onChange={(e) => setRenamingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                className="field"
              />
            </Field>
            <Button
              variant="primary"
              onClick={submitRename}
              disabled={busy || renamingName.trim().length === 0}
            >
              {renameClass.isPending ? '儲存中…' : '儲存'}
            </Button>
          </div>
        </Sheet>
      )}

      {/* 刪除確認用面板而不是就地長出兩顆按鈕 —— 就地展開會讓整列跳動，手指容易按到隔壁。 */}
      {deleting && (
        <Sheet key={deleting.id} open title={`刪除「${deleting.name}」`} onClose={() => setDeleting(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-ink">
              這個班沒有學生，刪掉之後就找不回來了。確定要刪除嗎？
            </p>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                deleteClass.mutate({ id: deleting.id }, { onSuccess: () => setDeleting(null) })
              }
            >
              {deleteClass.isPending ? '刪除中…' : '確定刪除'}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
