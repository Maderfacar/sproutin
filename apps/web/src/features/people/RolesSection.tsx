'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { apiErrorMessage } from '../../lib/api';
import { ROLE_LABEL } from '../../lib/roleLabels';
import type { UserRoleName, UserView } from '../../lib/types';
import { Badge, Button, ErrorNotice, Field, Row, SectionHead, Sheet } from '../../components/ui';
import { peopleErrorMessage, useGrantRole, useRevokeRole } from './hooks';

const ALL_ROLES: UserRoleName[] = ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN'];

const TEACHING_ROLES: UserRoleName[] = ['TEACHER', 'BUS_TEACHER'];
const GUARDIAN_ROLES: UserRoleName[] = ['PARENT', 'GUARDIAN'];

// 移除身分時會連帶失去什麼 —— 按下去之前先講清楚，不要事後才發現班級不見了。
function collateral(person: UserView, role: UserRoleName): string | null {
  const others = person.roles.filter((r) => r.role !== role).map((r) => r.role);
  if (TEACHING_ROLES.includes(role) && !others.some((r) => TEACHING_ROLES.includes(r))) {
    return person.teaching.length > 0
      ? `會同時取消他帶的 ${person.teaching.length} 個班級`
      : null;
  }
  if (GUARDIAN_ROLES.includes(role) && !others.some((r) => GUARDIAN_ROLES.includes(r))) {
    return person.guardianOf.length > 0
      ? `會同時解除他綁定的 ${person.guardianOf.length} 個小孩`
      : null;
  }
  return null;
}

// 身分（權限）設定。一個人可以有多個身分 —— 老師自己的小孩也在園裡是幼兒園常態。
// 「園長」只有現任園長看得到這個選項（否則行政可以自行升級，權限矩陣形同虛設）；
// 後端會再擋一次，這裡只決定顯示。
//
// 移除身分的確認收進底部面板（清葉加厚，2026-08-20）：舊版是就地把按鈕展開成兩顆，
// 而「確定移除」正好長在手指剛剛按過「移除」的位置上 —— 連按兩下就沒了。
export function RolesSection({ person }: { person: UserView }) {
  const { user } = useSession();
  const actorIsOwner = user.roles.some((r) => r.role === 'OWNER');
  const grant = useGrantRole();
  const revoke = useRevokeRole();

  const [adding, setAdding] = useState<UserRoleName | ''>('');
  const [confirming, setConfirming] = useState<UserRoleName | null>(null);

  const held = person.roles.map((r) => r.role);
  const available = ALL_ROLES.filter((r) => !held.includes(r) && (r !== 'OWNER' || actorIsOwner));
  const error = grant.error ?? revoke.error ?? null;
  const isLastRole = held.length === 1;
  const warning = confirming ? collateral(person, confirming) : null;

  return (
    <section>
      <SectionHead
        title="身分"
        description="決定這個人看得到什麼、能做什麼。一個人可以有多個身分（例如老師本身也是家長）"
        weight="review"
      />

      <ul>
        {held.map((role) => {
          const locked = role === 'OWNER' && !actorIsOwner;
          return (
            <li key={role}>
              <Row
                title={ROLE_LABEL[role] ?? role}
                trailing={
                  locked ? (
                    <Badge tone="neutral">只有園長能調整</Badge>
                  ) : isLastRole ? (
                    <Badge tone="neutral">至少要保留一個</Badge>
                  ) : (
                    <button
                      type="button"
                      aria-label={`移除 ${ROLE_LABEL[role] ?? role} 這個身分`}
                      disabled={revoke.isPending}
                      onClick={() => setConfirming(role)}
                      className="tappable min-h-touch shrink-0 rounded-md2 border border-stop-edge bg-stop-wash px-3 text-2xs font-semibold text-stop-text disabled:opacity-50"
                    >
                      移除
                    </button>
                  )
                }
              />
            </li>
          );
        })}
      </ul>

      {available.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <Field label="再給他一個身分">
            <span className="flex gap-2">
              <select
                aria-label="要增加的身分"
                value={adding}
                onChange={(e) => setAdding(e.target.value as UserRoleName | '')}
                className="field"
              >
                <option value="">請選擇…</option>
                {available.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role] ?? role}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                block={false}
                disabled={!adding || grant.isPending}
                onClick={() =>
                  adding &&
                  grant.mutate({ userId: person.id, role: adding }, { onSuccess: () => setAdding('') })
                }
              >
                加上
              </Button>
            </span>
          </Field>

          {adding === 'OWNER' && (
            <p className="rounded-md2 border border-note-edge bg-note-wash px-3 py-2.5 text-2xs leading-relaxed text-note-text">
              園長可以管理整個園所，包含人員與所有班級的資料。確定要把這個人設為園長再按「加上」。
            </p>
          )}
        </div>
      )}

      {error && <ErrorNotice message={peopleErrorMessage(error, apiErrorMessage(error))} />}

      <Sheet
        open={confirming !== null}
        title={confirming ? `移除「${ROLE_LABEL[confirming] ?? confirming}」？` : '移除這個身分？'}
        onClose={() => setConfirming(null)}
      >
        {confirming && (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-ink">
              移除之後 {person.displayName} 就不再有這個身分能做的事。
              {warning && <span className="font-bold text-stop-text">{warning}。</span>}
            </p>
            <Button
              variant="danger"
              disabled={revoke.isPending}
              onClick={() =>
                revoke.mutate(
                  { userId: person.id, role: confirming },
                  { onSuccess: () => setConfirming(null) },
                )
              }
            >
              {revoke.isPending ? '移除中…' : '確定移除'}
            </Button>
          </div>
        )}
      </Sheet>
    </section>
  );
}
