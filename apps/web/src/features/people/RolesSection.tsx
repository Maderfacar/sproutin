'use client';

import { useState } from 'react';
import { useSession } from '../../lib/session';
import { apiErrorMessage } from '../../lib/api';
import { ROLE_LABEL } from '../../lib/roleLabels';
import type { UserRoleName, UserView } from '../../lib/types';
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
export function RolesSection({ person }: { person: UserView }) {
  const { user } = useSession();
  const actorIsOwner = user.roles.some((r) => r.role === 'OWNER');
  const grant = useGrantRole();
  const revoke = useRevokeRole();

  const [adding, setAdding] = useState<UserRoleName | ''>('');
  const [confirming, setConfirming] = useState<UserRoleName | null>(null);

  const held = person.roles.map((r) => r.role);
  const available = ALL_ROLES.filter(
    (r) => !held.includes(r) && (r !== 'OWNER' || actorIsOwner),
  );
  const error = grant.error ?? revoke.error ?? null;
  const isLastRole = held.length === 1;

  return (
    <div className="border-t border-line pt-4">
      <p className="eyebrow">身分</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        決定這個人看得到什麼、能做什麼。一個人可以有多個身分（例如老師本身也是家長）。
      </p>

      <ul className="mt-3 space-y-2">
        {held.map((role) => {
          const warning = collateral(person, role);
          const locked = role === 'OWNER' && !actorIsOwner;
          return (
            <li key={role} className="rounded-md2 border border-line px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-ink">{ROLE_LABEL[role] ?? role}</span>
                {locked ? (
                  <span className="ml-auto text-xs text-ink-soft">只有園長能調整</span>
                ) : isLastRole ? (
                  <span className="ml-auto text-xs text-ink-soft">至少要保留一個</span>
                ) : (
                  <button
                    type="button"
                    disabled={revoke.isPending}
                    onClick={() => setConfirming(confirming === role ? null : role)}
                    className="btn-secondary ml-auto shrink-0 text-xs"
                  >
                    移除
                  </button>
                )}
              </div>

              {confirming === role && (
                <div className="mt-2 border-t border-line pt-2">
                  <p className="text-xs leading-relaxed text-ink">
                    確定要移除「{ROLE_LABEL[role] ?? role}」？
                    {warning && <span className="text-red-700"> {warning}。</span>}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={revoke.isPending}
                      onClick={() =>
                        revoke.mutate(
                          { userId: person.id, role },
                          { onSuccess: () => setConfirming(null) },
                        )
                      }
                      className="btn-primary text-xs"
                    >
                      確定移除
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="btn-secondary text-xs"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {available.length > 0 && (
        <div className="mt-3 flex gap-2">
          <select
            aria-label="要增加的身分"
            value={adding}
            onChange={(e) => setAdding(e.target.value as UserRoleName | '')}
            className="field"
          >
            <option value="">增加一個身分…</option>
            {available.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role] ?? role}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!adding || grant.isPending}
            onClick={() =>
              adding &&
              grant.mutate({ userId: person.id, role: adding }, { onSuccess: () => setAdding('') })
            }
            className="btn-primary shrink-0 text-sm"
          >
            加上
          </button>
        </div>
      )}

      {adding === 'OWNER' && (
        <p className="mt-2 rounded-md2 border border-line bg-black/[0.02] p-2.5 text-xs leading-relaxed text-ink">
          園長可以管理整個園所，包含人員與所有班級的資料。確定要把這個人設為園長再按「加上」。
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm leading-relaxed text-red-700">
          {peopleErrorMessage(error, apiErrorMessage(error))}
        </p>
      )}
    </div>
  );
}
