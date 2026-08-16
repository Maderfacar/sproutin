'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type {
  AdminStudentView,
  CreateStudentBody,
  StudentDetailView,
  UpdateStudentBody,
} from '../../lib/types';

// 學生管理（OWNER/ADMIN;階段2 刀2）。授權走 httpOnly cookie，實際權限由後端 Guard 判定。

export function useAdminStudents(classId?: string): UseQueryResult<AdminStudentView[]> {
  return useQuery({
    queryKey: ['adminStudents', classId ?? 'all'],
    queryFn: () =>
      apiGet<AdminStudentView[]>(
        classId ? `/api/students?classId=${encodeURIComponent(classId)}` : '/api/students',
      ),
  });
}

// 學生整合視圖（基本資料 + 班名 + 監護人）。授權沿用後端 ScopeGuard：
// 老師只看得到自班、家長只看得到自己小孩、園長/行政全校。
export function useStudentDetail(id: string | undefined): UseQueryResult<StudentDetailView> {
  return useQuery({
    queryKey: ['studentDetail', id],
    queryFn: () => apiGet<StudentDetailView>(`/api/students/${id}/detail`),
    enabled: Boolean(id),
  });
}

function useStudentMutation<TVariables>(mutationFn: (vars: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, TVariables>({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      // 班級的學生人數會變 + 家長端「我的小孩」清單可能改變。
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['myStudents'] });
    },
  });
}

export function useCreateStudent() {
  return useStudentMutation<CreateStudentBody>((body) =>
    apiSend<AdminStudentView>('/api/students', 'POST', body),
  );
}

export function useUpdateStudent() {
  return useStudentMutation<{ id: string; patch: UpdateStudentBody }>(({ id, patch }) =>
    apiSend<AdminStudentView>(`/api/students/${id}`, 'PATCH', patch),
  );
}

export const STUDENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: '在學',
  INACTIVE: '已離校',
  GRADUATED: '已畢業',
};
