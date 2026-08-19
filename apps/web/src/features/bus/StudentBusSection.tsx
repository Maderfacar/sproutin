'use client';

import { Icon } from '../../components/Icon';
import { SurfaceLink } from '../../components/SurfaceLink';
import { apiErrorMessage } from '../../lib/api';
import { busErrorMessage, useBusAssignments, useBusRoutes, useBusSettingsMutations } from './hooks';
import { Button, ErrorNotice, Field, Segmented, SkeletonLines } from '../../components/ui';

// 學生的娃娃車設定（掛在學生整合視圖裡的一段，不另開一頁）。
// **這是刻意的分層**：路線與接送點是全園共用的骨架（娃娃車設定頁）；
// 「這個孩子搭哪一班、在哪裡上下車」是**學生的屬性**，園所的實際作業就是這樣想的。
//
// 上下午分開設定，因為「早上從自己家上車、下午送到阿嬤家」很常見。
// 這一段改動即存（不是草稿）——一個孩子的車位設定就是幾個選擇，多一顆儲存鍵反而多一步。
export function StudentBusSection({ studentId }: { studentId: string }) {
  const { data: routes, isLoading, isError, error, refetch } = useBusRoutes();
  const { data: assignments } = useBusAssignments();
  const m = useBusSettingsMutations();

  if (isLoading) return <SkeletonLines lines={2} />;
  if (isError || !routes) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

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
      <p className="text-2xs leading-relaxed text-ink-soft">
        園所還沒有建立娃娃車路線。請先到{' '}
        <SurfaceLink href="/liff/admin/bus" className="underline">
          娃娃車設定
        </SurfaceLink>{' '}
        建立路線與接送點。
      </p>
    );
  }

  const pointOptions = [...(route?.points ?? [])].sort((a, b) => a.orderAm - b.orderAm);
  const routeValue = assignment?.routeId ?? '';
  // 路線通常只有一兩條，攤開比下拉快；多了才收成下拉（含「不搭」共四個以上就攤不開）。
  const routeOptions = [
    { value: '', label: '不搭' },
    ...routes.map((r) => ({ value: r.id, label: r.isActive ? r.name : `${r.name}（停用）` })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Field label="搭哪一條路線" group={routeOptions.length <= 3}>
        {routeOptions.length <= 3 ? (
          <Segmented
            label="娃娃車路線"
            options={routeOptions}
            value={routeValue}
            onChange={(id) => (id ? save({ routeId: id }) : m.removeAssignment.mutate(studentId))}
          />
        ) : (
          <select
            aria-label="娃娃車路線"
            value={routeValue}
            disabled={busy}
            onChange={(e) =>
              e.target.value ? save({ routeId: e.target.value }) : m.removeAssignment.mutate(studentId)
            }
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
        )}
      </Field>

      {assignment && (
        <>
          <Trip
            title="上學"
            rides={assignment.ridesMorning}
            busy={busy}
            onToggle={(v) => save({ ridesMorning: v })}
            pointLabel="早上在哪裡上車"
            pointValue={assignment.morningPointId ?? ''}
            onPointChange={(v) => save({ morningPointId: v || null })}
            points={pointOptions}
          />
          <Trip
            title="放學"
            rides={assignment.ridesAfternoon}
            busy={busy}
            onToggle={(v) => save({ ridesAfternoon: v })}
            pointLabel="下午送到哪裡"
            pointValue={assignment.afternoonPointId ?? ''}
            onPointChange={(v) => save({ afternoonPointId: v || null })}
            points={pointOptions}
          />

          <Button
            variant="danger"
            block={false}
            disabled={busy}
            onClick={() => m.removeAssignment.mutate(studentId)}
          >
            這個孩子不搭娃娃車了
          </Button>
        </>
      )}

      {actionError && (
        <ErrorNotice message={busErrorMessage(actionError, apiErrorMessage(actionError))} />
      )}

      <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        上午與下午可以是不同的接送點（例如下午送到阿嬤家）。取消搭車不會刪掉已經發生的乘車紀錄。
      </p>
    </div>
  );
}

// 一趟車：搭不搭 + 在哪裡上下車。接送點通常一戶一個、數量不少，維持原生下拉。
function Trip({
  title,
  rides,
  busy,
  onToggle,
  pointLabel,
  pointValue,
  onPointChange,
  points,
}: {
  title: string;
  rides: boolean;
  busy: boolean;
  onToggle: (value: boolean) => void;
  pointLabel: string;
  pointValue: string;
  onPointChange: (value: string) => void;
  points: readonly { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <button
        type="button"
        role="switch"
        aria-checked={rides}
        aria-label={`搭${title}車`}
        disabled={busy}
        onClick={() => onToggle(!rides)}
        className="tappable flex min-h-touch w-full items-center gap-3 text-left disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 text-base font-bold text-ink">搭{title}車</span>
        <span
          aria-hidden
          className={`relative block h-6 w-11 shrink-0 rounded-full border transition ${
            rides ? 'border-transparent bg-brand-primary' : 'border-line bg-surface-sunk'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full shadow-soft transition-all ${
              rides ? 'left-6 bg-white' : 'left-0.5 bg-ink-mute'
            }`}
          />
        </span>
      </button>

      {rides && (
        <Field label={pointLabel}>
          <select
            aria-label={pointLabel}
            value={pointValue}
            disabled={busy}
            onChange={(e) => onPointChange(e.target.value)}
            className="field"
          >
            <option value="">尚未指定接送點</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}
    </div>
  );
}
