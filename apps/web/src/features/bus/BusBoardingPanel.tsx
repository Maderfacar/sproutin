'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { StatusScreen } from '../../components/StatusScreen';
import { apiErrorMessage } from '../../lib/api';
import type { BusDirection, BusMarkBody, BusRosterEntry } from '../../lib/types';
import {
  busErrorMessage,
  getPositionOnce,
  useBusRideMutations,
  useBusRoster,
  useBusRoutes,
} from './hooks';

// 隨車老師點名。設計主軸＝**一手扶車、一手點**：
//   - 按鈕大、一次一件事；
//   - 請假的孩子不出現在名單上，只用一行字說明「有人被移走了」——
//     不說的話老師會以為系統漏人，反而要去翻別的頁面確認；
//   - 車到校一顆「全部下車」，個別有狀況再單獨處理（Human Owner 定案）；
//   - 點錯有「取消」，車在動的時候誤觸是必然會發生的事。

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function hhmm(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function BusBoardingPanel() {
  const { data: routes, isLoading: routesLoading } = useBusRoutes();
  const [routeId, setRouteId] = useState<string>('');
  const [date, setDate] = useState(todayInput);
  const [direction, setDirection] = useState<BusDirection>('MORNING');

  const activeRouteId = routeId || routes?.[0]?.id;
  const dateIso = new Date(`${date}T00:00:00.000Z`).toISOString();
  const { data: roster, isLoading, isError, error } = useBusRoster(activeRouteId, dateIso, direction);
  const rides = useBusRideMutations();

  const busy = Object.values(rides).some((m) => m.isPending);
  const actionError = Object.values(rides).map((m) => m.error).find(Boolean) ?? null;

  if (routesLoading) return <StatusScreen status="loading" message="載入路線中…" />;
  if (!routes || routes.length === 0) {
    return (
      <section className="card p-6 text-center">
        <p className="text-sm leading-relaxed text-ink">目前沒有你負責的娃娃車路線。</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          請園所到「娃娃車設定」把你指派為這條路線的隨車老師。
        </p>
      </section>
    );
  }

  // 位置只在按下的當下抓一次；抓不到就不送，功能照常運作（Human Owner 定案）。
  const mark = async (
    action: 'board' | 'alight' | 'absent' | 'undo',
    studentIds: string[],
  ): Promise<void> => {
    if (!activeRouteId || studentIds.length === 0) return;
    const position = action === 'board' || action === 'alight' ? await getPositionOnce() : undefined;
    const body: BusMarkBody = { routeId: activeRouteId, date: dateIso, direction, studentIds, ...position };
    rides[action].mutate(body);
  };

  const entries = roster?.entries ?? [];
  const boarded = entries.filter((e) => e.ride?.status === 'BOARDED');
  const waiting = entries.filter((e) => !e.ride || e.ride.status === 'SCHEDULED');
  const absent = entries.filter((e) => e.ride?.status === 'ABSENT');
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
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-5">
        <label className="field-label">
          <span>路線</span>
          <select
            value={activeRouteId ?? ''}
            onChange={(e) => setRouteId(e.target.value)}
            className="field"
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex overflow-hidden rounded-md2 border border-line">
          {(['MORNING', 'AFTERNOON'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`flex-1 py-3 text-sm font-semibold ${
                direction === d ? 'bg-brand-primary text-white' : 'text-ink-soft'
              }`}
            >
              {d === 'MORNING' ? '上學' : '放學'}
            </button>
          ))}
        </div>

        <label className="field-label">
          <span>日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
        </label>

        {isLoading && <p className="text-sm text-ink-soft">載入名單中…</p>}
        {isError && <p className="text-sm text-red-700">{apiErrorMessage(error)}</p>}

        {roster && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3 text-xs">
            <span className="chip bg-brand-primary/10 text-ink">
              {direction === 'MORNING' ? '已上車' : '已上車'} {boarded.length}
            </span>
            <span className="chip bg-black/5 text-ink-soft">待上車 {waiting.length}</span>
            <span className="chip bg-black/5 text-ink-soft">未搭 {absent.length}</span>
          </div>
        )}
      </section>

      {actionError && (
        <p className="text-sm text-red-700">
          {busErrorMessage(actionError, apiErrorMessage(actionError))}
        </p>
      )}

      {roster && entries.length === 0 && (
        <section className="card p-6 text-center">
          <p className="text-sm leading-relaxed text-ink">這一趟沒有要載的孩子。</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            名單來自園所設定的固定名單；若少了人，請園所到學生管理裡確認。
          </p>
        </section>
      )}

      {roster &&
        Array.from(groups.entries())
          .filter(([, list]) => list.length > 0)
          .map(([pointId, list]) => (
            <section key={pointId ?? 'none'} className="card p-4">
              <p className="mb-1 text-xs text-ink-soft">
                {pointName(pointId)}
                {pointEta(pointId) ? ` · ${pointEta(pointId)}` : ''}
              </p>
              <ul>
                {list.map((entry) => {
                  const status = entry.ride?.status ?? 'SCHEDULED';
                  return (
                    <li
                      key={entry.studentId}
                      className="flex items-center gap-3 border-t border-line py-3 first:border-t-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{entry.studentName}</p>
                        <p className="truncate text-xs text-ink-soft">
                          {status === 'BOARDED' && `已上車 ${hhmm(entry.ride!.boardedAt)}`}
                          {status === 'ALIGHTED' && `已下車 ${hhmm(entry.ride!.alightedAt)}`}
                          {status === 'ABSENT' && '今日未搭'}
                          {status === 'SCHEDULED' && '待上車'}
                        </p>
                      </div>

                      {status === 'SCHEDULED' && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void mark('absent', [entry.studentId])}
                            className="btn-secondary shrink-0 text-xs"
                          >
                            今日未搭
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void mark('board', [entry.studentId])}
                            className="btn-primary shrink-0 px-6 py-3 text-base"
                          >
                            上車
                          </button>
                        </>
                      )}

                      {status === 'BOARDED' && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void mark('undo', [entry.studentId])}
                            className="btn-secondary shrink-0 text-xs"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void mark('alight', [entry.studentId])}
                            className="btn-primary shrink-0 px-6 py-3 text-base"
                          >
                            下車
                          </button>
                        </>
                      )}

                      {(status === 'ALIGHTED' || status === 'ABSENT') && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void mark('undo', [entry.studentId])}
                          className="btn-secondary shrink-0 text-xs"
                        >
                          改回待上車
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

      {roster && boarded.length > 0 && (
        <section className="card p-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void mark('alight', boarded.map((e) => e.studentId))}
            className="btn-primary w-full py-4 text-base"
          >
            {direction === 'MORNING'
              ? `車已到校，全部下車（${boarded.length}）`
              : `全部下車（${boarded.length}）`}
          </button>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            半路被家長接走的孩子，可以在上面單獨處理。
          </p>
        </section>
      )}

      {roster && roster.onLeaveCount > 0 && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
          <Icon name="cal" className="mt-0.5 h-4 w-4 shrink-0" />
          今天有 {roster.onLeaveCount} 位孩子請假，已自動從名單移除。
        </p>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        點上下車時會記錄一次位置。若手機不允許定位或沒有訊號，這筆就沒有位置，功能照常使用。
      </p>
    </div>
  );
}
