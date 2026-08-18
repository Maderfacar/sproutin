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
import { SkeletonRows } from '../../components/Skeleton';

// 班級管理（OWNER/ADMIN）：新增、改名、刪除空班。
// 刪除只在「沒有學生、沒有老師編制」時允許 —— 由後端把關，前端只負責把原因講清楚。
//
// 桌面版 /admin/classes 與手機版 /liff/admin/classes 共用這一份（docs/04 §3b）。
// 權限判斷刻意留在這裡而不是兩個外框裡：放在外框就有兩份，遲早會有一邊漏改。
export function ClassesManager() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: classes, isLoading, isError, error } = useMyClasses();
  const createClass = useCreateClass();
  const renameClass = useRenameClass();
  const deleteClass = useDeleteClass();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以管理班級。" />;
  }
  if (isLoading) {
    return <SkeletonRows rows={4} />;
  }
  if (isError || !classes) {
    return <StatusScreen status="error" message={apiErrorMessage(error)} />;
  }

  const busy = createClass.isPending || renameClass.isPending || deleteClass.isPending;
  const actionError = createClass.error ?? renameClass.error ?? deleteClass.error ?? null;

  const submitNew = (): void => {
    const name = newName.trim();
    if (!name) return;
    createClass.mutate({ name }, { onSuccess: () => setNewName('') });
  };

  const submitRename = (id: string): void => {
    const name = editingName.trim();
    if (!name) return;
    renameClass.mutate({ id, name }, { onSuccess: () => setEditingId(null) });
  };

  return (
    <div className="space-y-6">
      <section className="rise-in card p-5">
        <p className="eyebrow">新增班級</p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newName}
            maxLength={40}
            placeholder="例如：向日葵班"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitNew()}
            className="field"
          />
          <button
            type="button"
            onClick={submitNew}
            disabled={busy || newName.trim().length === 0}
            className="btn-primary shrink-0 text-sm"
          >
            新增
          </button>
        </div>
      </section>

      {actionError && (
        <p className="text-sm text-red-700">
          {classErrorMessage(actionError, apiErrorMessage(actionError))}
        </p>
      )}

      <section className="rise-in" style={{ animationDelay: '0.05s' }}>
        <p className="eyebrow mb-2">目前班級（{classes.length}）</p>
        {classes.length === 0 ? (
          <p className="border-t border-line py-6 text-center text-sm text-ink-soft">
            還沒有任何班級，先用上面的欄位新增一個。
          </p>
        ) : (
          <ul className="border-t border-line">
            {classes.map((cls) => (
              <li key={cls.id} className="border-b border-line py-3">
                {editingId === cls.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingName}
                      maxLength={40}
                      autoFocus
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitRename(cls.id)}
                      className="field"
                    />
                    <button
                      type="button"
                      onClick={() => submitRename(cls.id)}
                      disabled={busy}
                      className="btn-primary shrink-0 text-sm"
                    >
                      儲存
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="btn-secondary shrink-0 text-sm"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{cls.name}</p>
                      <p className="text-xs text-ink-soft">{cls.studentCount} 位學生</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`修改 ${cls.name} 的名稱`}
                      onClick={() => {
                        setEditingId(cls.id);
                        setEditingName(cls.name);
                        setConfirmingId(null);
                      }}
                      className="btn-secondary shrink-0 text-xs"
                    >
                      改名
                    </button>
                    {confirmingId === cls.id ? (
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            deleteClass.mutate(
                              { id: cls.id },
                              { onSuccess: () => setConfirmingId(null) },
                            )
                          }
                          disabled={busy}
                          className="rounded-2xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700"
                        >
                          確定刪除
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="btn-secondary text-xs"
                        >
                          取消
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`刪除 ${cls.name}`}
                        onClick={() => setConfirmingId(cls.id)}
                        disabled={cls.studentCount > 0}
                        title={cls.studentCount > 0 ? '班上還有學生，不能刪除' : undefined}
                        className="btn-secondary shrink-0 text-xs disabled:opacity-30"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        班級一旦有學生或老師編制就不能刪除，避免出缺勤、請假等歷史紀錄失去歸屬。
      </p>
    </div>
  );
}
