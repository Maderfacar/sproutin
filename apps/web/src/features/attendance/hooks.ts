'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type { AttendanceView, MarkAttendanceBody, AttendanceStatus } from '../../lib/types';
import { runBatched } from './bulk';
import { tapFeedback } from '../../lib/haptics';

// 授權走 httpOnly cookie，前端不需傳 token。

// 某學生的出缺勤（後端 scope 過濾:家長限自己小孩）。
export function useAttendance(studentId: string | undefined): UseQueryResult<AttendanceView[]> {
  return useQuery({
    queryKey: ['attendance', studentId],
    queryFn: () => apiGet<AttendanceView[]>(`/api/attendance?studentId=${encodeURIComponent(studentId!)}`),
    enabled: Boolean(studentId),
  });
}

// 整班某日出缺勤（老師點名用）。dateIso 為 UTC 午夜 ISO,與 POST 對齊。
export function useClassAttendance(
  classId: string | undefined,
  dateIso: string,
): UseQueryResult<AttendanceView[]> {
  return useQuery({
    queryKey: ['attendance', 'class', classId, dateIso],
    queryFn: () =>
      apiGet<AttendanceView[]>(
        `/api/attendance?classId=${encodeURIComponent(classId!)}&date=${encodeURIComponent(dateIso)}`,
      ),
    enabled: Boolean(classId),
  });
}

// 點名（新標記或改狀態）。成功後讓班級某日出缺勤重取。
export function useMarkAttendance(classId: string | undefined, dateIso: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['attendance', 'class', classId, dateIso] });

  // 成功才震。點名時老師的眼睛多半在孩子身上不在螢幕上，
  // 手上那一下才是他真正收到的「存好了」（見 lib/haptics）。
  const done = (): void => {
    tapFeedback();
    void invalidate();
  };

  const mark = useMutation({
    mutationFn: (body: MarkAttendanceBody) => apiSend<AttendanceView>('/api/attendance', 'POST', body),
    onSuccess: done,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AttendanceStatus }) =>
      apiSend<AttendanceView>(`/api/attendance/${encodeURIComponent(id)}`, 'PATCH', { status }),
    onSuccess: done,
  });

  return { mark, update };
}

// 一鍵把「還沒點名的人」全部標成同一個狀態。
//
// 點名的真實流程是「九成的孩子都到了」——舊版每個孩子四顆一樣大的按鈕，
// 25 人就是 25 次點擊，而且每一次都在做同一個決定。改成「剩下的全部標到校」之後，
// 老師只需要處理例外。
//
// 後端一次只收一個人，所以這裡分批送（見 ./bulk）：限制同時進行的數量、
// **每一筆各自成敗、中途失敗不中斷其他人**，全部跑完才失效一次查詢
// （每成功一筆就 invalidate 會讓整班名單重取 25 次）。
export function useBulkMarkAttendance(classId: string | undefined, dateIso: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { studentIds: readonly string[]; status: AttendanceStatus }) =>
      runBatched(input.studentIds, (studentId) =>
        apiSend<AttendanceView>('/api/attendance', 'POST', {
          studentId,
          date: dateIso,
          status: input.status,
        }),
      ),
    // 整批全部成功才震。有人沒成功的時候畫面會要老師補點，
    // 這時給一個「成功」的手感是在說謊。
    onSuccess: (result) => {
      if (result.failed.length === 0) tapFeedback();
    },
    onSettled: () => {
      // 成功或失敗都要重取：失敗時畫面必須回到「伺服器真正的樣子」，
      // 否則老師會以為某幾個人已經點到了。
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'class', classId, dateIso] });
    },
  });
}
