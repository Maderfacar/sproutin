'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type { ClassView } from '../../lib/types';
import { useScopedPersona } from '../../lib/useScopedPersona';

// 我的班級（staff;後端 scope 過濾）。授權走 cookie。
// 這是**角色聯集**：園長／行政拿到全校的班，老師拿到自己帶的。
export function useMyClasses(enabled = true): UseQueryResult<ClassView[]> {
  return useQuery({
    queryKey: ['classes'],
    queryFn: () => apiGet<ClassView[]>('/api/classes'),
    enabled,
  });
}

// 只有我實際帶的班。導師身分專用 —— 園長兼導師的人用聯集版會拿到全校的班
// （Human Owner 2026-08-20 回報：只帶一班的導師在點名頁看得到別人的班）。
// **另一個 queryKey**，不能和聯集版共用快取。
export function useTeachingClasses(enabled = true): UseQueryResult<ClassView[]> {
  return useQuery({
    queryKey: ['classes', 'teaching'],
    queryFn: () => apiGet<ClassView[]>('/api/classes?scope=TEACHING'),
    enabled,
  });
}

// 現在這個身分「看得到哪些班」。與 useVisibleStudents 同一條規則：
// 導師只有自己帶的，其餘身分用角色聯集。縮小在後端做，且只縮小不放大。
//
// **新頁面請用這個，不要直接呼叫 useMyClasses()**（後台管理頁例外 ——
// 那些頁面本來就只有園長／行政進得來，需要的就是全校的班）。
export function useVisibleClasses(): UseQueryResult<ClassView[]> {
  // 桌面後台不套身分（見 lib/useScopedPersona）。
  const persona = useScopedPersona();
  const isTeacher = persona === 'teacher';
  const union = useMyClasses(!isTeacher);
  const teaching = useTeachingClasses(isTeacher);
  return isTeacher ? teaching : union;
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
  const { data: classes, isLoading, isError } = useVisibleClasses();
  const [classId, setClassId] = useState<string | undefined>(undefined);
  useEffect(() => {
    const first = classes?.[0];
    // 換身分之後班級清單會整個換掉 —— 舊的選擇必須失效，
    // 否則導師身分會停在剛剛以園長身分選的那個班（與 useSelectedStudent 同一條理由）。
    if (classId && classes && !classes.some((c) => c.id === classId)) {
      setClassId(first?.id);
      return;
    }
    if (first && !classId) {
      setClassId(first.id);
    }
  }, [classes, classId]);
  return { classes, classId, setClassId, isLoading, isError };
}
