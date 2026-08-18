'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { StatusScreen } from '../../components/StatusScreen';
import { SurfaceLink } from '../../components/SurfaceLink';
import { Band } from '../../components/Band';
import { apiErrorMessage } from '../../lib/api';
import type { BusDirection } from '../../lib/types';
import { usePeople } from '../people/hooks';
import { useMyStudents } from '../../lib/queries';
import { RouteEditor, type StaffOption } from './RouteEditor';
import { busErrorMessage, useBusAssignments, useBusRoutes, useBusSettingsMutations } from './hooks';
import { SkeletonCards } from '../../components/Skeleton';

// 娃娃車設定（園長／行政）。**桌面版與手機版用的是這同一個元件**，
// 差別只有外框（/admin/bus 與 /liff/admin/bus）—— 功能不因裝置而不同。
//
// 這一頁只管「路線與接送點」這層全園共用的骨架；
// 「哪個孩子搭哪一班、在哪裡上下車」在學生那一層（見頁尾指路）。

export function BusSettingsPanel() {
  const { data: routes, isLoading, isError, error } = useBusRoutes();
  const { data: assignments } = useBusAssignments();
  const { data: people } = usePeople();
  const { data: students } = useMyStudents();
  const m = useBusSettingsMutations();

  const [openRouteId, setOpenRouteId] = useState<string | null>(null);
  const [newRouteName, setNewRouteName] = useState('');

  if (isLoading) return <SkeletonCards cards={2} />;
  if (isError || !routes) return <StatusScreen status="error" message={apiErrorMessage(error)} />;

  // 隨車老師的候選：帶 BUS_TEACHER 或 TEACHER 身分的在職人員。
  const staff: StaffOption[] = (people ?? [])
    .filter(
      (p) =>
        p.status === 'ACTIVE' &&
        p.roles.some((r) => r.role === 'BUS_TEACHER' || r.role === 'TEACHER'),
    )
    .map((p) => ({ id: p.id, name: p.displayName }));

  const busy = Object.values(m).some((mutation) => mutation.isPending);
  const actionError =
    Object.values(m)
      .map((mutation) => mutation.error)
      .find(Boolean) ?? null;

  const countFor = (routeId: string): number =>
    (assignments ?? []).filter((a) => a.routeId === routeId).length;

  // 每個接送點載哪些孩子。上下午可能是不同的點，兩邊都算進來（同一個孩子在同一點不重複列）。
  const nameOf = new Map((students ?? []).map((s) => [s.id, s.name]));
  const ridersByPoint = new Map<string, string[]>();
  for (const a of assignments ?? []) {
    const name = nameOf.get(a.studentId);
    if (!name) continue;
    for (const pointId of [a.morningPointId, a.afternoonPointId]) {
      if (!pointId) continue;
      const list = ridersByPoint.get(pointId) ?? [];
      if (!list.includes(name)) list.push(name);
      ridersByPoint.set(pointId, list);
    }
  }

  const submitRoute = (): void => {
    const name = newRouteName.trim();
    if (!name) return;
    m.createRoute.mutate({ name }, { onSuccess: (route) => {
      setNewRouteName('');
      setOpenRouteId(route.id);
    } });
  };

  return (
    <div>
      <Band kind="manage" title="新增路線" description="先建一條路線，再把每個孩子的家加進來當接送點">
        <section className="rise-in card p-5">
          <div className="flex gap-2">
            <input
              type="text"
              value={newRouteName}
              maxLength={40}
              placeholder="路線名稱，例如「東區線」"
              onChange={(e) => setNewRouteName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitRoute()}
              className="field"
            />
            <button
              type="button"
              onClick={submitRoute}
              disabled={busy || newRouteName.trim().length === 0}
              className="btn-primary shrink-0 text-sm"
            >
              新增
            </button>
          </div>
        </section>
      </Band>

      {actionError && (
        <p className="mb-5 text-sm text-red-700">
          {busErrorMessage(actionError, apiErrorMessage(actionError))}
        </p>
      )}

      <Band
        kind="review"
        title="目前的路線"
        description="展開一條路線可以排接送點順序、設出發時間、指定隨車老師"
      >
        {routes.length === 0 ? (
          <section className="rise-in card p-6 text-center">
            <p className="text-sm leading-relaxed text-ink">還沒有任何娃娃車路線。</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              先建一條路線（例如「東區線」），再把每個孩子的家加進來當接送點。
            </p>
          </section>
        ) : (
          <section className="rise-in space-y-3" style={{ animationDelay: '0.05s' }}>
            {routes.map((route) => {
              const isOpen = openRouteId === route.id;
              return (
                <div key={route.id} className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenRouteId(isOpen ? null : route.id)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <Icon name="bus" className="h-5 w-5 shrink-0 text-ink-soft" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
                        {route.name}
                        {!route.isActive && (
                          <span className="chip bg-black/5 text-ink-soft">已停用</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        上午 {route.morningDepart || '未設定'} · 下午 {route.afternoonDepart || '未設定'}
                        {' · '}
                        {route.points.length} 個接送點 · {countFor(route.id)} 人
                      </p>
                    </div>
                    <span aria-hidden className="shrink-0 text-xs text-ink-soft">
                      {isOpen ? '收合' : '展開'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-line p-4">
                      <RouteEditor
                        route={route}
                        staff={staff}
                        ridersByPoint={ridersByPoint}
                        assignedCount={countFor(route.id)}
                        busy={busy}
                        onUpdateRoute={(patch) => m.updateRoute.mutate({ id: route.id, patch })}
                        onDeleteRoute={() => m.deleteRoute.mutate(route.id)}
                        onAddPoint={(input) =>
                          m.createPoint.mutate({ routeId: route.id, name: input.name, address: input.address })
                        }
                        onUpdatePoint={(id, patch) => m.updatePoint.mutate({ id, patch })}
                        onDeletePoint={(id) => m.deletePoint.mutate(id)}
                        onMovePoint={(direction: BusDirection, pointIds) =>
                          m.reorderPoints.mutate({ routeId: route.id, direction, pointIds })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </Band>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        這一頁只管路線與接送點。每個孩子搭哪一班、在哪裡上下車，請到{' '}
        <SurfaceLink href="/liff/admin/students" className="underline">
          學生管理
        </SurfaceLink>{' '}
        設定。園所本身不是接送點——上午的終點、下午的起點固定是園所。
      </p>
    </div>
  );
}
