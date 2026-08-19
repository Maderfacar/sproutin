'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import { useScopedPersona } from '../../lib/useScopedPersona';
import type { NotificationView } from '../../lib/types';

// 授權走 httpOnly cookie，前端不需傳 token。

const KEY = ['notifications'];

// 本人站內通知（後端以 userId 過濾）。
//
// **範圍要跟著身分切**（Human Owner 2026-08-20 回報：家長身分點開訊息中心，
// 看得到其他小朋友的聯絡簿）。這些通知本來就都是發給他的 —— 他同時是老師 ——
// 所以不是權限問題，是**世界混在一起**：老師收到的那些躺在家長的收件匣裡，
// 點下去就進到別人小孩的那一本。
//
// 縮小在後端做（`?relation=GUARDIAN`）：通知的標題與副標裡本來就寫著其他孩子的名字，
// 只在前端藏起來等於名字仍然送到了瀏覽器。與 useVisibleStudents 同一條規則。
// **另一個 queryKey**，不能和聯集版共用快取。
export function useNotifications(): UseQueryResult<NotificationView[]> {
  const persona = useScopedPersona();
  const guardianOnly = persona === 'parent';
  return useQuery({
    queryKey: guardianOnly ? [...KEY, 'guardian'] : KEY,
    queryFn: () =>
      apiGet<NotificationView[]>(
        guardianOnly ? '/api/notifications?relation=GUARDIAN' : '/api/notifications',
      ),
  });
}

/**
 * 標記通知已讀。**樂觀更新**：點下去那一刻小圓點就消失，不等伺服器回來
 * —— 在訊息中心裡點一則就同時要跳頁，等回應才變的話小圓點會在離開後才消失。
 * 失敗就把清單復原（不靜默吞掉：復原本身就是看得見的回饋）。
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend<NotificationView>(`/api/notifications/${encodeURIComponent(id)}/read`, 'PATCH'),
    // 家長版（['notifications','guardian']）與聯集版是**兩份快取**，
    // 所以樂觀更新與回復都要走前綴，不能只動其中一份 ——
    // 只動一份的話，切到家長身分點一則，小圓點不會消失。
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueriesData<NotificationView[]>({ queryKey: KEY });
      queryClient.setQueriesData<NotificationView[]>({ queryKey: KEY }, (old) =>
        old?.map((n) =>
          n.id === id && n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    // 成功或失敗都以伺服器為準重取一次。
    // 前綴失效：家長版（['notifications','guardian']）與聯集版是兩份快取，
    // 只失效其中一份的話，切回校方身分會看到那一則又變回未讀。
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
