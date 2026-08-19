'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { apiErrorMessage } from '../../lib/api';
import type { BusDirection, BusMarkBody, BusRosterEntry } from '../../lib/types';
import {
  busErrorMessage,
  getPositionOnce,
  useBusRideMutations,
  useBusRoster,
  useBusRoutes,
} from './hooks';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  Progress,
  Segmented,
  Sheet,
  SkeletonCards,
  SkeletonRows,
} from '../../components/ui';
import { formatTime, schoolToday } from '../../lib/datetime';

// 隨車老師點名。設計主軸＝**一手扶車、一手點**（互動已由 Human Owner 驗收，這一版只換視覺與回饋）：
//   - 按鈕大、一次一件事；
//   - 請假的孩子不出現在名單上，只用一行字說明「有人被移走了」——
//     不說的話老師會以為系統漏人，反而要去翻別的頁面確認；
//   - 車到校一顆「全部下車」，個別有狀況再單獨處理（Human Owner 定案）；
//   - 點錯有「取消」，車在動的時候誤觸是必然會發生的事。
//
// 這一版補上的是**進度與已存檔**：舊版點下去只有那一列變樣，沒有「存好了」的訊號，
// 而車上訊號不穩的時候，看不到回饋的人就會再點一次（這正是重複送出的來源）。
// 路線與去回程預設就是對的，日期收進面板 —— 改日期是例外，不該每天佔一個欄位。

function dateLabel(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 · 週${week}`;
}

function hhmm(iso: string | null): string {
  return iso ? formatTime(iso) : '';
}

const DIRECTIONS = [
  { value: 'MORNING' as const, label: '上學' },
  { value: 'AFTERNOON' as const, label: '放學' },
];

export function BusBoardingPanel() {
  const { data: routes, isLoading: routesLoading } = useBusRoutes();
  const [routeId, setRouteId] = useState<string>('');
  const [date, setDate] = useState(schoolToday);
  const [direction, setDirection] = useState<BusDirection>('MORNING');
  const [dateSheet, setDateSheet] = useState(false);
  const [routeSheet, setRouteSheet] = useState(false);

  const activeRouteId = routeId || routes?.[0]?.id;
  const dateIso = new Date(`${date}T00:00:00.000Z`).toISOString();
  const {
    data: roster,
    isLoading,
    isError,
    error,
    refetch,
  } = useBusRoster(activeRouteId, dateIso, direction);
  const rides = useBusRideMutations();

  const busy = Object.values(rides).some((m) => m.isPending);
  const actionError = Object.values(rides).map((m) => m.error).find(Boolean) ?? null;

  if (routesLoading) return <SkeletonCards cards={2} />;
  if (!routes || routes.length === 0) {
    return (
      <EmptyState
        title="目前沒有你負責的娃娃車路線"
        hint="請園所到「娃娃車設定」把你指派為這條路線的隨車老師"
      />
    );
  }

  // 位置只在按下的當下抓一次；抓不到就不送，功能照常運作（Human Owner 定案）。
  const mark = async (
    action: 'board' | 'alight' | 'absent' | 'undo',
    studentIds: string[],
  ): Promise<void> => {
    if (!activeRouteId || studentIds.length === 0) return;
    const position = action === 'board' || action === 'alight' ? await getPositionOnce() : undefined;
    const body: BusMarkBody = {
      routeId: activeRouteId,
      date: dateIso,
      direction,
      studentIds,
      ...position,
    };
    rides[action].mutate(body);
  };

  const entries = roster?.entries ?? [];
  const boarded = entries.filter((e) => e.ride?.status === 'BOARDED');
  const waiting = entries.filter((e) => !e.ride || e.ride.status === 'SCHEDULED');
  const absent = entries.filter((e) => e.ride?.status === 'ABSENT');
  const alighted = entries.filter((e) => e.ride?.status === 'ALIGHTED');
  const isToday = date === schoolToday();
  const currentRoute = routes.find((r) => r.id === activeRouteId);

  const pointName = (id: string | null): string =>
    roster?.points.find((p) => p.id === id)?.name ?? '未指定接送點';
  const pointEta = (id: string | null): string | null => {
    const point = roster?.points.find((p) => p.id === id);
    return (direction === 'MORNING' ? point?.etaAm : point?.etaPm) ?? null;
  };

  // 依接送點分組（door-to-door：一個接送點通常就是一戶人家，兄弟姊妹會排在一起）。
  const groups = new Map<string | null, BusRosterEntry[]>();
  for (const point of roster?.points ?? []) groups.set(point.id, []);
  for (const entry of entries) {
    const list = groups.get(entry.pointId) ?? [];
    list.push(entry);
    groups.set(entry.pointId, list);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 路線與日期。預設就是對的，所以做小 —— 它們是「要換才動」不是「每次要填」。 */}
      <div className="flex flex-wrap items-center gap-2">
        {routes.length > 1 && routes.length <= 3 && (
          <Segmented
            label="選擇路線"
            options={routes.map((r) => ({ value: r.id, label: r.name }))}
            value={activeRouteId}
            onChange={setRouteId}
          />
        )}
        {routes.length > 3 && (
          <Button variant="secondary" onClick={() => setRouteSheet(true)}>
            {currentRoute?.name ?? '選擇路線'}
            <Icon name="chev" className="h-4 w-4 rotate-90" />
          </Button>
        )}
        <Button variant={isToday ? 'text' : 'secondary'} onClick={() => setDateSheet(true)}>
          {isToday ? '今天' : dateLabel(date)}
          <Icon name="cal" className="h-4 w-4" />
        </Button>
      </div>

      <Segmented
        label="這一趟是上學還是放學"
        options={DIRECTIONS}
        value={direction}
        onChange={setDirection}
      />

      {isError && <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />}
      {actionError && (
        <ErrorNotice message={busErrorMessage(actionError, apiErrorMessage(actionError))} />
      )}
      {isLoading && <SkeletonRows rows={6} />}

      {roster && entries.length === 0 && (
        <EmptyState
          title="這一趟沒有要載的孩子"
          hint="名單來自園所設定的固定名單；若少了人，請園所到學生管理裡確認"
        />
      )}

      {roster && entries.length > 0 && (
        <>
          {/* 進度 + 已存檔一直在最上面：車上訊號不穩時，沒有回饋的人會再點一次。 */}
          <Progress
            value={entries.length - waiting.length}
            max={entries.length}
            unit="已點名"
            saved={!busy}
          />

          <div className="flex flex-wrap gap-2">
            <Badge tone={boarded.length > 0 ? 'good' : 'neutral'}>車上 {boarded.length}</Badge>
            <Badge tone={waiting.length > 0 ? 'note' : 'neutral'}>待上車 {waiting.length}</Badge>
            {alighted.length > 0 && <Badge tone="good">已下車 {alighted.length}</Badge>}
            {absent.length > 0 && <Badge tone="stop">未搭 {absent.length}</Badge>}
          </div>

          {Array.from(groups.entries())
            .filter(([, list]) => list.length > 0)
            .map(([pointId, list]) => (
              <section key={pointId ?? 'none'} className="flex flex-col gap-2">
                <p className="text-2xs font-semibold text-ink-mute">
                  {pointName(pointId)}
                  {pointEta(pointId) ? ` · ${pointEta(pointId)}` : ''}
                </p>

                {list.map((entry) => {
                  const status = entry.ride?.status ?? 'SCHEDULED';
                  return (
                    <div
                      key={entry.studentId}
                      className="rounded-card border border-line-strong bg-surface p-3.5"
                    >
                      <div className="mb-2.5 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-lg font-bold text-ink">
                          {entry.studentName}
                        </p>
                        {status === 'BOARDED' && (
                          <Badge tone="good">車上 {hhmm(entry.ride!.boardedAt)}</Badge>
                        )}
                        {status === 'ALIGHTED' && (
                          <Badge tone="good">已下車 {hhmm(entry.ride!.alightedAt)}</Badge>
                        )}
                        {status === 'ABSENT' && <Badge tone="stop">今日未搭</Badge>}
                        {status === 'SCHEDULED' && <Badge tone="note">待上車</Badge>}
                      </div>

                      {/* 一列只有一顆大的：車在動的時候，手指要找的是「那一顆」。 */}
                      {status === 'SCHEDULED' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void mark('board', [entry.studentId])}
                            className="tappable min-h-touch flex-1 rounded-md2 bg-brand-wash text-lg font-bold text-brand-primary ring-1 ring-inset ring-brand-primary disabled:opacity-50"
                          >
                            上車
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void mark('absent', [entry.studentId])}
                            className="tappable min-h-touch rounded-md2 border border-line px-3 text-2xs font-semibold text-ink-soft disabled:opacity-50"
                          >
                            今日未搭
                          </button>
                        </div>
                      )}

                      {status === 'BOARDED' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void mark('alight', [entry.studentId])}
                            className="tappable min-h-touch flex-1 rounded-md2 bg-brand-wash text-lg font-bold text-brand-primary ring-1 ring-inset ring-brand-primary disabled:opacity-50"
                          >
                            下車
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void mark('undo', [entry.studentId])}
                            className="tappable min-h-touch rounded-md2 border border-line px-3 text-2xs font-semibold text-ink-soft disabled:opacity-50"
                          >
                            取消
                          </button>
                        </div>
                      )}

                      {(status === 'ALIGHTED' || status === 'ABSENT') && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void mark('undo', [entry.studentId])}
                          className="tappable min-h-touch w-full rounded-md2 border border-line text-2xs font-semibold text-ink-soft disabled:opacity-50"
                        >
                          改回待上車
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            ))}

          {/* 車到校那一下最需要的一顆。留在名單下面（Human Owner 已驗收的位置）：
              先確認車上是誰，再一次全部放下車。 */}
          {boarded.length > 0 && (
            <div className="flex flex-col gap-2">
              <Button variant="primary" disabled={busy} onClick={() => void mark('alight', boarded.map((e) => e.studentId))}>
                <Icon name="check" className="h-5 w-5" />
                {direction === 'MORNING'
                  ? `車已到校，全部下車（${boarded.length}）`
                  : `全部下車（${boarded.length}）`}
              </Button>
              <p className="text-2xs leading-relaxed text-ink-soft">
                半路被家長接走的孩子，可以在上面單獨處理。
              </p>
            </div>
          )}
        </>
      )}

      {roster && roster.onLeaveCount > 0 && (
        <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
          <Icon name="cal" className="mt-0.5 h-4 w-4 shrink-0" />
          今天有 {roster.onLeaveCount} 位孩子請假，已自動從名單移除。
        </p>
      )}

      <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        點上下車時會記錄一次位置。若手機不允許定位或沒有訊號，這筆就沒有位置，功能照常使用。
      </p>

      {/* 換日期是例外動作，收進面板 —— 不該每天佔一個欄位的位置。 */}
      <Sheet open={dateSheet} title="看哪一天" onClose={() => setDateSheet(false)}>
        <div className="flex flex-col gap-4">
          <Field label="日期">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field tabular-nums"
            />
          </Field>
          <Button
            variant="secondary"
            onClick={() => {
              setDate(schoolToday());
              setDateSheet(false);
            }}
          >
            回到今天
          </Button>
        </div>
      </Sheet>

      {/* 路線超過三條就攤不開了，改用面板選 —— 硬擠成一排比下拉更糟。 */}
      <Sheet open={routeSheet} title="選擇路線" onClose={() => setRouteSheet(false)}>
        <ul className="flex flex-col gap-2">
          {routes.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  setRouteId(r.id);
                  setRouteSheet(false);
                }}
                aria-current={r.id === activeRouteId ? 'true' : undefined}
                className={`tappable flex min-h-touch w-full items-center rounded-md2 border px-4 py-3 text-left text-base font-bold ${
                  r.id === activeRouteId
                    ? 'border-brand-primary bg-brand-wash text-brand-primary'
                    : 'border-line-strong bg-surface text-ink'
                }`}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
