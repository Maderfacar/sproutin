'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { AttendanceView } from '../../lib/types';

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
