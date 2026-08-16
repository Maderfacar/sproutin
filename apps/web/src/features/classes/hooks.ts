'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type { ClassView } from '../../lib/types';

// 我的班級（staff;後端 scope 過濾）。授權走 cookie。
export function useMyClasses(): UseQueryResult<ClassView[]> {
  return useQuery({
    queryKey: ['classes'],
    queryFn: () => apiGet<ClassView[]>('/api/classes'),
  });
}

// --- 班級管理（OWNER/ADMIN;階段2 刀2）---
// 任何異動後同時讓班級與學生清單重取（換班/刪班會影響兩邊的人數與歸屬）。
function useClassMutation<TVariables>(
  mutationFn: (vars: TVariables) => Promise<unknown>,
): ReturnType<typeof useMutation<unknown, Error, TVariables>> {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, TVariables>({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
    },
  });
}

export function useCreateClass() {
  return useClassMutation<{ name: string }>((body) => apiSend<ClassView>('/api/classes', 'POST', body));
}

export function useRenameClass() {
  return useClassMutation<{ id: string; name: string }>(({ id, name }) =>
    apiSend<ClassView>(`/api/classes/${id}`, 'PATCH', { name }),
  );
}

export function useDeleteClass() {
  return useClassMutation<{ id: string }>(({ id }) => apiSend<void>(`/api/classes/${id}`, 'DELETE'));
}

// 班級管理專屬的錯誤訊息（後端以 409 擋下不安全的刪除）。
export function classErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'class_name_taken':
      return '已經有同名的班級了，換一個名字。';
    case 'class_has_students':
      return '這個班還有學生，請先把學生換到其他班再刪除。';
    case 'class_has_teachers':
      return '這個班還有老師編制，請先調整老師的班級再刪除。';
    case 'class_not_found':
      return '找不到這個班級，可能已經被刪除了。';
    default:
      return fallback;
  }
}

// 班級選擇 + 預設第一個。
export function useSelectedClass(): {
  classes: ClassView[] | undefined;
  classId: string | undefined;
  setClassId: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
} {
  const { data: classes, isLoading, isError } = useMyClasses();
  const [classId, setClassId] = useState<string | undefined>(undefined);
  useEffect(() => {
    const first = classes?.[0];
    if (first && !classId) {
      setClassId(first.id);
    }
  }, [classes, classId]);
  return { classes, classId, setClassId, isLoading, isError };
}
