'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type {
  BusAssignmentView,
  BusDirection,
  BusMarkBody,
  BusPointView,
  BusRideView,
  BusRosterView,
  BusRouteView,
  MyBusView,
  SaveBusAssignmentBody,
  SaveBusPointBody,
  SaveBusRouteBody,
} from '../../lib/types';

// 查詢 key 一律以 ['bus', ...] 開頭 —— 失效時用**前綴**一次涵蓋設定、名單與點名畫面，
// 避免只失效其中一邊而讓使用者看到過期資料（Phase 7 教訓）。
const BUS_KEY = 'bus';

export function useBusRoutes(enabled = true): UseQueryResult<BusRouteView[]> {
  return useQuery({
    queryKey: [BUS_KEY, 'routes'],
    queryFn: () => apiGet<BusRouteView[]>('/api/bus/routes'),
    enabled,
  });
}

export function useBusAssignments(routeId?: string): UseQueryResult<BusAssignmentView[]> {
  return useQuery({
    queryKey: [BUS_KEY, 'assignments', routeId ?? 'all'],
    queryFn: () =>
      apiGet<BusAssignmentView[]>(
        routeId ? `/api/bus/assignments?routeId=${encodeURIComponent(routeId)}` : '/api/bus/assignments',
      ),
  });
}

export function useBusRoster(
  routeId: string | undefined,
  dateIso: string,
  direction: BusDirection,
): UseQueryResult<BusRosterView> {
  return useQuery({
    queryKey: [BUS_KEY, 'roster', routeId, dateIso, direction],
    queryFn: () =>
      apiGet<BusRosterView>(
        `/api/bus/rides?routeId=${encodeURIComponent(routeId!)}` +
          `&date=${encodeURIComponent(dateIso)}&direction=${direction}`,
      ),
    enabled: Boolean(routeId),
  });
}

export function useMyBus(studentId: string | undefined): UseQueryResult<MyBusView> {
  return useQuery({
    queryKey: [BUS_KEY, 'me', studentId],
    queryFn: () => apiGet<MyBusView>(`/api/me/bus?studentId=${encodeURIComponent(studentId!)}`),
    enabled: Boolean(studentId),
  });
}

// 設定頁的寫入動作。全部共用同一組失效邏輯：改了路線/接送點，名單與點名畫面都可能跟著變。
export function useBusSettingsMutations() {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: [BUS_KEY] });
  };

  return {
    createRoute: useMutation({
      mutationFn: (body: SaveBusRouteBody) => apiSend<BusRouteView>('/api/bus/routes', 'POST', body),
      onSuccess: invalidate,
    }),
    updateRoute: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<SaveBusRouteBody> }) =>
        apiSend<BusRouteView>(`/api/bus/routes/${encodeURIComponent(id)}`, 'PATCH', patch),
      onSuccess: invalidate,
    }),
    deleteRoute: useMutation({
      mutationFn: (id: string) =>
        apiSend<{ deleted: true }>(`/api/bus/routes/${encodeURIComponent(id)}`, 'DELETE'),
      onSuccess: invalidate,
    }),
    createPoint: useMutation({
      mutationFn: (body: SaveBusPointBody) => apiSend<BusPointView>('/api/bus/points', 'POST', body),
      onSuccess: invalidate,
    }),
    updatePoint: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<SaveBusPointBody> }) =>
        apiSend<BusPointView>(`/api/bus/points/${encodeURIComponent(id)}`, 'PATCH', patch),
      onSuccess: invalidate,
    }),
    deletePoint: useMutation({
      mutationFn: (id: string) =>
        apiSend<{ deleted: true }>(`/api/bus/points/${encodeURIComponent(id)}`, 'DELETE'),
      onSuccess: invalidate,
    }),
    reorderPoints: useMutation({
      mutationFn: (body: { routeId: string; direction: BusDirection; pointIds: string[] }) =>
        apiSend<BusPointView[]>('/api/bus/points/reorder', 'POST', body),
      onSuccess: invalidate,
    }),
    saveAssignment: useMutation({
      mutationFn: (body: SaveBusAssignmentBody) =>
        apiSend<BusAssignmentView>('/api/bus/assignments', 'PUT', body),
      onSuccess: invalidate,
    }),
    removeAssignment: useMutation({
      mutationFn: (studentId: string) =>
        apiSend<{ deleted: true }>(`/api/bus/assignments/${encodeURIComponent(studentId)}`, 'DELETE'),
      onSuccess: invalidate,
    }),
  };
}

// 點名的四個動作。都是同一個形狀，只差在打哪一支端點。
export function useBusRideMutations() {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: [BUS_KEY] });
  };
  const send = (action: string) => (body: BusMarkBody) =>
    apiSend<BusRideView[]>(`/api/bus/rides/${action}`, 'POST', body);

  const board = useMutation({ mutationFn: send('board'), onSuccess: invalidate });
  const alight = useMutation({ mutationFn: send('alight'), onSuccess: invalidate });
  const absent = useMutation({ mutationFn: send('absent'), onSuccess: invalidate });
  const undo = useMutation({ mutationFn: send('undo'), onSuccess: invalidate });

  return { board, alight, absent, undo };
}

// 娃娃車專屬錯誤訊息。後端以 400 擋下的每一種情況都要說清楚「為什麼不給」，
// 不然園長只會看到一句「操作失敗」然後不知道該改什麼。
export function busErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'route_has_rides':
      return '這條路線已經有乘車紀錄，不能刪除。請改成「停用」，紀錄才查得到。';
    case 'point_in_use':
      return '還有孩子在這個接送點上下車，先幫他們換一個接送點再刪。';
    case 'point_not_on_route':
      return '這個接送點不屬於這條路線。';
    case 'student_not_on_route':
      return '這個孩子不在這條路線的名單上。';
    case 'route_not_found':
      return '找不到這條路線，可能剛被別人刪掉了。';
    case 'point_order_mismatch':
      return '接送點順序對不上，請重新整理頁面再試。';
    default:
      return fallback;
  }
}

// 抓一次目前位置。抓不到就回 undefined —— 功能照常運作，只是這筆沒有位置（Human Owner 定案）。
// 刻意設 8 秒上限：老師在車上等不了瀏覽器慢慢定位，逾時就先記錄下來比較重要。
export function getPositionOnce(): Promise<{ lat: number; lng: number } | undefined> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  });
}
