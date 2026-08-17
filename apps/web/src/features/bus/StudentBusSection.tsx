'use client';

import { Icon } from '../../components/Icon';
import { SurfaceLink } from '../../components/SurfaceLink';
import { apiErrorMessage } from '../../lib/api';
import { busErrorMessage, useBusAssignments, useBusRoutes, useBusSettingsMutations } from './hooks';

// 學生的娃娃車設定（掛在學生整合視圖裡的一段，不另開一頁）。
// **這是刻意的分層**：路線與接送點是全園共用的骨架（娃娃車設定頁）；
// 「這個孩子搭哪一班、在哪裡上下車」是**學生的屬性**，園所的實際作業就是這樣想的。
//
// 上下午分開設定，因為「早上從自己家上車、下午送到阿嬤家」很常見。
export function StudentBusSection({ studentId }: { studentId: string }) {
  const { data: routes, isLoading, isError, error } = useBusRoutes();
  const { data: assignments } = useBusAssignments();
  const m = useBusSettingsMutations();

  if (isLoading) return <p className="text-sm text-ink-soft">載入娃娃車設定中…</p>;
  if (isError || !routes) return <p className="text-sm text-red-700">{apiErrorMessage(error)}</p>;

  const assignment = (assignments ?? []).find((a) => a.studentId === studentId) ?? null;
  const route = routes.find((r) => r.id === assignment?.routeId) ?? null;
  const busy = m.saveAssignment.isPending || m.removeAssignment.isPending;
  const actionError = m.saveAssignment.error ?? m.removeAssignment.error ?? null;

  const save = (patch: Partial<NonNullable<typeof assignment>>): void => {
    const base = assignment ?? {
      studentId,
      routeId: routes[0]!.id,
      morningPointId: null,
      afternoonPointId: null,
      ridesMorning: true,
      ridesAfternoon: true,
    };
    const next = { ...base, ...patch };
    // 換路線時把接送點清掉 —— 舊路線的接送點在新路線上不存在，留著只會被後端擋下來。
    const routeChanged = patch.routeId !== undefined && patch.routeId !== base.routeId;
    m.saveAssignment.mutate({
      studentId,
      routeId: next.routeId,
      morningPointId: routeChanged ? null : next.morningPointId,
      afternoonPointId: routeChanged ? null : next.afternoonPointId,
      ridesMorning: next.ridesMorning,
      ridesAfternoon: next.ridesAfternoon,
    });
  };

  if (routes.length === 0) {
    return (
      <p className="border-t border-line py-4 text-sm leading-relaxed text-ink-soft">
        園所還沒有建立娃娃車路線。請先到{' '}
        <SurfaceLink href="/liff/admin/bus" className="underline">
          娃娃車設定
        </SurfaceLink>{' '}
        建立路線與接送點。
      </p>
    );
  }

  const pointOptions = [...(route?.points ?? [])].sort((a, b) => a.orderAm - b.orderAm);

  return (
    <div className="space-y-3 border-t border-line pt-4">
      <label className="field-label">
        <span>路線</span>
        <select
          value={assignment?.routeId ?? ''}
          disabled={busy}
          onChange={(e) => (e.target.value ? save({ routeId: e.target.value }) : undefined)}
          className="field"
        >
          <option value="">不搭娃娃車</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {!r.isActive && '（已停用）'}
            </option>
          ))}
        </select>
      </label>

      {assignment && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={assignment.ridesMorning}
                  disabled={busy}
                  onChange={(e) => save({ ridesMorning: e.target.checked })}
                />
                搭上學車
              </label>
              <select
                aria-label="上午上車的接送點"
                value={assignment.morningPointId ?? ''}
                disabled={busy || !assignment.ridesMorning}
                onChange={(e) => save({ morningPointId: e.target.value || null })}
                className="field"
              >
                <option value="">尚未指定接送點</option>
                {pointOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={assignment.ridesAfternoon}
                  disabled={busy}
                  onChange={(e) => save({ ridesAfternoon: e.target.checked })}
                />
                搭放學車
              </label>
              <select
                aria-label="下午下車的接送點"
                value={assignment.afternoonPointId ?? ''}
                disabled={busy || !assignment.ridesAfternoon}
                onChange={(e) => save({ afternoonPointId: e.target.value || null })}
                className="field"
              >
                <option value="">尚未指定接送點</option>
                {pointOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => m.removeAssignment.mutate(studentId)}
            className="btn-secondary text-xs"
          >
            這個孩子不搭娃娃車了
          </button>
        </>
      )}

      {actionError && (
        <p className="text-sm text-red-700">
          {busErrorMessage(actionError, apiErrorMessage(actionError))}
        </p>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        上午與下午可以是不同的接送點（例如下午送到阿嬤家）。取消搭車不會刪掉已經發生的乘車紀錄。
      </p>
    </div>
  );
}
