'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { SurfaceLink } from '../../components/SurfaceLink';
import { apiErrorMessage } from '../../lib/api';
import type { BusDirection } from '../../lib/types';
import { usePeople } from '../people/hooks';
import { useMyStudents } from '../../lib/queries';
import { RouteEditor, type StaffOption } from './RouteEditor';
import { busErrorMessage, useBusAssignments, useBusRoutes, useBusSettingsMutations } from './hooks';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  SectionHead,
  Sheet,
  SkeletonCards,
} from '../../components/ui';

// 娃娃車設定（園長／行政）。**桌面版與手機版用的是這同一個元件**，
// 差別只有外框（/admin/bus 與 /liff/admin/bus）—— 功能不因裝置而不同。
//
// 這一頁只管「路線與接送點」這層全園共用的骨架；
// 「哪個孩子搭哪一班、在哪裡上下車」在學生那一層（見頁尾指路）。
//
// 清單頁版型（清葉加厚，2026-08-20）：一顆「新增路線」+ 一份路線清單。
// 舊版把新增表單常駐在最上面，但進這一頁十次有九次是來調整既有路線的 ——
// 建路線是一年做幾次的事。
export function BusSettingsPanel() {
  const { data: routes, isLoading, isError, error, refetch } = useBusRoutes();
  const { data: assignments } = useBusAssignments();
  const { data: people } = usePeople();
  // 後台管理頁的例外：這一頁只有園長／行政進得來，接送點載的是全校任何一個孩子。
  const { data: students } = useMyStudents();
  const m = useBusSettingsMutations();

  const [openRouteId, setOpenRouteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteError, setNewRouteError] = useState<string | null>(null);

  if (isLoading) return <SkeletonCards cards={2} />;
  if (isError || !routes) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

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
    if (!name) {
      setNewRouteError('請填路線名稱，例如「東區線」。');
      return;
    }
    m.createRoute.mutate(
      { name },
      {
        onSuccess: (route) => {
          setNewRouteName('');
          setNewRouteError(null);
          setCreateOpen(false);
          // 新建的路線直接展開 —— 接下來一定是要加接送點。
          setOpenRouteId(route.id);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        <Icon name="bus" className="h-5 w-5" />
        新增路線
      </Button>

      {actionError && (
        <ErrorNotice message={busErrorMessage(actionError, apiErrorMessage(actionError))} />
      )}

      <section>
        <SectionHead
          title={`目前的路線（${routes.length}）`}
          description="點開一條路線可以排接送點順序、設出發時間、指定隨車老師"
          weight="review"
        />

        {routes.length === 0 ? (
          <EmptyState
            title="還沒有任何娃娃車路線"
            hint="先建一條路線（例如「東區線」），再把每個孩子的家加進來當接送點"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {routes.map((route) => {
              const isOpen = openRouteId === route.id;
              return (
                <li
                  key={route.id}
                  className="overflow-hidden rounded-tile border border-line-strong bg-surface"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenRouteId(isOpen ? null : route.id)}
                    className="tappable flex min-h-touch w-full items-center gap-3 p-4 text-left"
                  >
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md2 border border-brand-primary bg-brand-wash text-brand-primary"
                    >
                      <Icon name="bus" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-lg font-bold text-ink">{route.name}</span>
                        {!route.isActive && <Badge tone="neutral">已停用</Badge>}
                      </span>
                      <span className="mt-0.5 block truncate text-2xs text-ink-soft">
                        上午 {route.morningDepart || '未設定'} · 下午{' '}
                        {route.afternoonDepart || '未設定'} · {route.points.length} 個接送點 ·{' '}
                        {countFor(route.id)} 人
                      </span>
                    </span>
                    <Icon
                      name="chev"
                      className={`h-4 w-4 shrink-0 text-ink-soft transition ${
                        isOpen ? '-rotate-90' : 'rotate-90'
                      }`}
                    />
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
                        onDeleteRoute={() => {
                          m.deleteRoute.mutate(route.id);
                          setOpenRouteId(null);
                        }}
                        onAddPoint={(input) =>
                          m.createPoint.mutate({
                            routeId: route.id,
                            name: input.name,
                            address: input.address,
                          })
                        }
                        onUpdatePoint={(id, patch) => m.updatePoint.mutate({ id, patch })}
                        onDeletePoint={(id) => m.deletePoint.mutate(id)}
                        onMovePoint={(direction: BusDirection, pointIds) =>
                          m.reorderPoints.mutate({ routeId: route.id, direction, pointIds })
                        }
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        這一頁只管路線與接送點。每個孩子搭哪一班、在哪裡上下車，請到{' '}
        <SurfaceLink href="/liff/admin/students" className="underline">
          學生管理
        </SurfaceLink>{' '}
        設定。園所本身不是接送點——上午的終點、下午的起點固定是園所。
      </p>

      <Sheet open={createOpen} title="新增路線" onClose={() => setCreateOpen(false)}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submitRoute();
          }}
          className="flex flex-col gap-4"
        >
          <Field
            label="路線名稱"
            hint="建好之後再把每個孩子的家加進來當接送點"
            error={newRouteError ?? undefined}
          >
            <input
              type="text"
              value={newRouteName}
              maxLength={40}
              placeholder="例如：東區線"
              onChange={(e) => {
                setNewRouteName(e.target.value);
                if (newRouteError) setNewRouteError(null);
              }}
              className="field"
            />
          </Field>
          <Button type="submit" variant="primary" disabled={busy}>
            {m.createRoute.isPending ? '新增中…' : '新增'}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
