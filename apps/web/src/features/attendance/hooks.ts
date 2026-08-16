'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { AttendanceView, MarkAttendanceBody, AttendanceStatus } from '../../lib/types';

// 某學生的出缺勤（後端 scope 過濾:家長限自己小孩）。
export function useAttendance(studentId: string | undefined): UseQueryResult<AttendanceView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['attendance', studentId],
    queryFn: () =>
      apiGet<AttendanceView[]>(`/api/attendance?studentId=${encodeURIComponent(studentId!)}`, accessToken),
    enabled: Boolean(studentId),
  });
}

// 整班某日出缺勤（老師點名用）。dateIso 為 UTC 午夜 ISO,與 POST 對齊。
export function useClassAttendance(
  classId: string | undefined,
  dateIso: string,
): UseQueryResult<AttendanceView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['attendance', 'class', classId, dateIso],
    queryFn: () =>
      apiGet<AttendanceView[]>(
        `/api/attendance?classId=${encodeURIComponent(classId!)}&date=${encodeURIComponent(dateIso)}`,
        accessToken,
      ),
    enabled: Boolean(classId),
  });
}

// 點名（新標記或改狀態）。成功後讓班級某日出缺勤重取。
export function useMarkAttendance(classId: string | undefined, dateIso: string) {
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['attendance', 'class', classId, dateIso] });

  const mark = useMutation({
    mutationFn: (body: MarkAttendanceBody) =>
      apiSend<AttendanceView>('/api/attendance', accessToken, 'POST', body),
    onSuccess: () => void invalidate(),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AttendanceStatus }) =>
      apiSend<AttendanceView>(`/api/attendance/${encodeURIComponent(id)}`, accessToken, 'PATCH', { status }),
    onSuccess: () => void invalidate(),
  });

  return { mark, update };
}
