'use client';

import { useState, type ReactNode } from 'react';
import type { AdminStudentView, ClassView, GuardianRelation, UserView } from '../../lib/types';
import { apiErrorMessage } from '../../lib/api';
import { ROLE_LABEL } from '../../lib/roleLabels';
import { BindingSection } from './BindingSection';
import { RolesSection } from './RolesSection';
import {
  Avatar,
  Badge,
  Button,
  ErrorNotice,
  Field,
  Row,
  SectionHead,
  Sheet,
} from '../../components/ui';
import {
  RELATION_LABEL,
  peopleErrorMessage,
  useAddGuardianship,
  useAddTeacherAssignment,
  useRemoveGuardianship,
  useRemoveTeacherAssignment,
  useUpdatePerson,
} from './hooks';

interface PersonEditorProps {
  person: UserView;
  classes: ClassView[];
  students: AdminStudentView[];
  onClose: () => void;
}

const RELATIONS: GuardianRelation[] = ['MOTHER', 'FATHER', 'GRANDPARENT', 'GUARDIAN'];

// 一次要問清楚的一件事。**每一個「解除／停用／移除」都走這裡**，
// 不在原地把按鈕展開成兩顆 —— 就地展開的確認鈕會長在手指剛剛按過的位置上，最容易誤按。
interface Ask {
  title: string;
  body: string;
  label: string;
  run: () => void;
}

// 單一人員的編輯面板：改名 / 啟用停用 / 關聯（家長綁小孩、老師帶班級）/ LINE 綁定。
// 關聯即權限：綁定後這個人立刻看得到那個小孩或那個班，因此每個動作都寫稽核（後端）。
//
// 這一塊刻意**留在頁面上而不是收進 Sheet**（PeopleManager 的決定）：裡面有四段，
// 塞進 70vh 的面板會變成面板裡再捲一層。因為它在頁面上，底下那些確認面板才不會疊在面板上。
export function PersonEditor({ person, classes, students, onClose }: PersonEditorProps) {
  const [name, setName] = useState(person.displayName);
  const [studentId, setStudentId] = useState('');
  const [relation, setRelation] = useState<GuardianRelation>('MOTHER');
  const [classId, setClassId] = useState('');
  const [ask, setAsk] = useState<Ask | null>(null);
  const [bindOpen, setBindOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const updatePerson = useUpdatePerson();
  const addGuardianship = useAddGuardianship();
  const removeGuardianship = useRemoveGuardianship();
  const addAssignment = useAddTeacherAssignment();
  const removeAssignment = useRemoveTeacherAssignment();

  const error =
    updatePerson.error ??
    addGuardianship.error ??
    removeGuardianship.error ??
    addAssignment.error ??
    removeAssignment.error ??
    null;

  const roleNames = new Set(person.roles.map((r) => r.role));
  const isGuardianRole = roleNames.has('PARENT') || roleNames.has('GUARDIAN');
  const isTeacherRole = roleNames.has('TEACHER') || roleNames.has('BUS_TEACHER');
  const isActive = person.status === 'ACTIVE';

  const unboundStudents = students.filter(
    (s) => !person.guardianOf.some((g) => g.studentId === s.id),
  );
  const unassignedClasses = classes.filter((c) => !person.teaching.some((t) => t.classId === c.id));
  const nameChanged = name.trim() !== person.displayName && name.trim().length > 0;

  return (
    <section className="rise-in flex flex-col gap-6 rounded-tile border border-line-strong bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <Avatar name={person.displayName} />
        <div className="min-w-0 flex-1">
          {/* 這一塊在頁面上而不是面板裡，所以要自己說出「現在編輯的是誰」——
              名字在上面的名單裡也有一份，少了這一行就分不出來哪個才是編輯中的。 */}
          <p className="truncate font-serif text-xl font-bold tracking-tight text-ink">
            編輯 {person.displayName}
          </p>
          <p className="truncate text-2xs text-ink-soft">
            {person.roles.map((r) => ROLE_LABEL[r.role] ?? r.role).join(' · ') || '還沒有任何身分'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="收起編輯"
          className="tappable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft"
        >
          ✕
        </button>
      </div>

      <Field label="顯示名稱">
        <span className="flex gap-2">
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            className="field"
          />
          <Button
            variant="primary"
            block={false}
            disabled={updatePerson.isPending || !nameChanged}
            onClick={() =>
              updatePerson.mutate({ id: person.id, patch: { displayName: name.trim() } })
            }
          >
            儲存
          </Button>
        </span>
      </Field>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-base font-bold text-ink">
            {isActive ? '帳號啟用中' : '帳號已停用'}
            {!isActive && <Badge tone="neutral">停用</Badge>}
          </p>
          <p className="mt-0.5 text-2xs leading-relaxed text-ink-soft">
            {isActive
              ? '停用後這個人就無法登入，但資料與歷史紀錄都會留著。'
              : '重新啟用後即可再次登入。'}
          </p>
        </div>
        {isActive ? (
          <Button
            variant="danger"
            block={false}
            disabled={updatePerson.isPending}
            onClick={() =>
              setAsk({
                title: `停用 ${person.displayName}？`,
                body: '停用之後他就登不進來，也不能再被指派身分或班級。已經建立的請假、訊息與稽核紀錄都會完整保留，隨時可以重新啟用。',
                label: '確定停用這個帳號',
                run: () =>
                  updatePerson.mutate({ id: person.id, patch: { status: 'INACTIVE' } }),
              })
            }
          >
            停用帳號
          </Button>
        ) : (
          <Button
            variant="secondary"
            block={false}
            disabled={updatePerson.isPending}
            onClick={() => updatePerson.mutate({ id: person.id, patch: { status: 'ACTIVE' } })}
          >
            重新啟用
          </Button>
        )}
      </div>

      {/* 停用的帳號不能再被指派身分或關聯（後端 409 user_disabled）——
          先在這裡講清楚，比讓人填完按下去才發現好（Human Owner 2026-08-20 回報：
          已停用的帳號仍可分配導師身分）。 */}
      {!isActive && (
        <div className="rounded-md2 border border-note-edge bg-note-wash px-4 py-3 text-sm leading-relaxed text-note-text">
          這個帳號目前停用中，不能再指派身分、班級或綁定小孩。
          既有的關聯仍然解除得掉；要新增請先按上面的「重新啟用」。
        </div>
      )}

      <RolesSection person={person} />

      {isGuardianRole && (
        <Relations
          title="負責的小孩"
          description="綁定之後他立刻看得到這個孩子的所有資料"
          emptyText="還沒綁定任何小孩 —— 這位家長目前看不到任何資料。"
          addLabel="綁定一個小孩"
          canAdd={isActive && unboundStudents.length > 0}
          onAdd={() => setBindOpen(true)}
          items={person.guardianOf.map((g) => ({
            id: g.id,
            title: g.studentName,
            detail: RELATION_LABEL[g.relation],
            removeLabel: `解除與 ${g.studentName} 的綁定`,
            onRemove: () =>
              setAsk({
                title: `解除與 ${g.studentName} 的綁定？`,
                body: `解除後 ${person.displayName} 就看不到 ${g.studentName} 的出缺勤、聯絡簿與請假，也收不到相關通知。`,
                label: '確定解除綁定',
                run: () => removeGuardianship.mutate({ id: g.id }),
              }),
          }))}
          busy={removeGuardianship.isPending}
        />
      )}

      {isTeacherRole && (
        <Relations
          title="任教班級"
          description="排入之後他立刻看得到這個班的所有孩子"
          emptyText="還沒排班 —— 這位老師目前看不到任何學生。"
          addLabel="排入一個班級"
          canAdd={isActive && unassignedClasses.length > 0}
          onAdd={() => setAssignOpen(true)}
          items={person.teaching.map((t) => ({
            id: t.id,
            title: t.className,
            removeLabel: `解除 ${t.className} 的編制`,
            onRemove: () =>
              setAsk({
                title: `把 ${person.displayName} 移出 ${t.className}？`,
                body: `移出之後他就看不到 ${t.className} 的孩子，也不能再點名或寫聯絡簿。已經寫過的紀錄不受影響。`,
                label: '確定移出這個班級',
                run: () => removeAssignment.mutate({ id: t.id }),
              }),
          }))}
          busy={removeAssignment.isPending}
        />
      )}

      <BindingSection person={person} />

      {error && (
        <ErrorNotice message={peopleErrorMessage(error, apiErrorMessage(error))} />
      )}

      {/* 綁定小孩。學生通常上百位，維持原生下拉；關係有四種，也超過攤得開的數量。 */}
      <Sheet open={bindOpen} title="綁定一個小孩" onClose={() => setBindOpen(false)}>
        <div className="flex flex-col gap-4">
          <Field label="哪一個孩子">
            <select
              aria-label="選擇小孩"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="field"
            >
              <option value="">請選擇…</option>
              {unboundStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="關係">
            <select
              aria-label="關係"
              value={relation}
              onChange={(e) => setRelation(e.target.value as GuardianRelation)}
              className="field"
            >
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {RELATION_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
          <Button
            variant="primary"
            disabled={!studentId || addGuardianship.isPending}
            onClick={() =>
              addGuardianship.mutate(
                { userId: person.id, studentId, relation },
                {
                  onSuccess: () => {
                    setStudentId('');
                    setBindOpen(false);
                  },
                },
              )
            }
          >
            {addGuardianship.isPending ? '綁定中…' : '綁定'}
          </Button>
        </div>
      </Sheet>

      <Sheet open={assignOpen} title="排入一個班級" onClose={() => setAssignOpen(false)}>
        <ul className="flex flex-col gap-2">
          {unassignedClasses.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={addAssignment.isPending}
                onClick={() => {
                  setClassId(c.id);
                  addAssignment.mutate(
                    { userId: person.id, classId: c.id },
                    {
                      onSuccess: () => {
                        setClassId('');
                        setAssignOpen(false);
                      },
                    },
                  );
                }}
                className={`tappable flex min-h-touch w-full items-center rounded-md2 border px-4 py-3 text-left text-base font-bold disabled:opacity-50 ${
                  classId === c.id
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

      {/* 所有「會拿走某個人某樣東西」的動作都停在這裡問一次，並且說清楚他會失去什麼。 */}
      <Sheet open={ask !== null} title={ask?.title ?? ''} onClose={() => setAsk(null)}>
        {ask && (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-ink">{ask.body}</p>
            <Button
              variant="danger"
              onClick={() => {
                ask.run();
                setAsk(null);
              }}
            >
              {ask.label}
            </Button>
          </div>
        )}
      </Sheet>
    </section>
  );
}

interface RelationItem {
  id: string;
  title: string;
  detail?: string;
  removeLabel: string;
  onRemove: () => void;
}

// 「他負責誰」與「他帶哪一班」形狀完全一樣，所以是同一個元件 ——
// 兩邊各做一套，遲早會有一邊的改動漏掉。
function Relations({
  title,
  description,
  emptyText,
  addLabel,
  canAdd,
  onAdd,
  items,
  busy,
}: {
  title: string;
  description: string;
  emptyText: string;
  addLabel: string;
  canAdd: boolean;
  onAdd: () => void;
  items: RelationItem[];
  busy: boolean;
}): ReactNode {
  return (
    <section>
      <SectionHead title={title} description={description} weight="review" />
      {items.length === 0 ? (
        <p className="text-2xs leading-relaxed text-ink-soft">{emptyText}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Row
                title={item.title}
                detail={item.detail}
                trailing={
                  <button
                    type="button"
                    aria-label={item.removeLabel}
                    disabled={busy}
                    onClick={item.onRemove}
                    className="tappable min-h-touch shrink-0 rounded-md2 border border-stop-edge bg-stop-wash px-3 text-2xs font-semibold text-stop-text disabled:opacity-50"
                  >
                    解除
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <div className="mt-3">
          <Button variant="secondary" block={false} onClick={onAdd}>
            {addLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
