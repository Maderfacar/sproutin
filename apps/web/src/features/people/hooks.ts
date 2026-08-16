'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../lib/api';
import type {
  CreateUserBody,
  GuardianRelation,
  UpdateUserBody,
  UserRoleName,
  UserView,
} from '../../lib/types';

// 人員帳號與關聯（OWNER/ADMIN;階段2 刀3）。授權走 httpOnly cookie，實際權限由後端 Guard 判定。

export function usePeople(role?: UserRoleName): UseQueryResult<UserView[]> {
  return useQuery({
    queryKey: ['people', role ?? 'all'],
    queryFn: () =>
      apiGet<UserView[]>(role ? `/api/users?role=${encodeURIComponent(role)}` : '/api/users'),
  });
}

// 任何人員/關聯異動後：人員清單必重取;綁定改變會影響「誰看得到誰」→ 學生與班級快取一併失效。
function usePeopleMutation<TVariables>(mutationFn: (vars: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, TVariables>({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['people'] });
      void queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      void queryClient.invalidateQueries({ queryKey: ['myStudents'] });
    },
  });
}

export function useCreatePerson() {
  return usePeopleMutation<CreateUserBody>((body) => apiSend<UserView>('/api/users', 'POST', body));
}

export function useUpdatePerson() {
  return usePeopleMutation<{ id: string; patch: UpdateUserBody }>(({ id, patch }) =>
    apiSend<UserView>(`/api/users/${id}`, 'PATCH', patch),
  );
}

export function useAddGuardianship() {
  return usePeopleMutation<{ userId: string; studentId: string; relation: GuardianRelation }>((body) =>
    apiSend<{ id: string }>('/api/guardianships', 'POST', body),
  );
}

export function useRemoveGuardianship() {
  return usePeopleMutation<{ id: string }>(({ id }) =>
    apiSend<void>(`/api/guardianships/${id}`, 'DELETE'),
  );
}

export function useAddTeacherAssignment() {
  return usePeopleMutation<{ userId: string; classId: string }>((body) =>
    apiSend<{ id: string }>('/api/teacher-assignments', 'POST', body),
  );
}

export function useRemoveTeacherAssignment() {
  return usePeopleMutation<{ id: string }>(({ id }) =>
    apiSend<void>(`/api/teacher-assignments/${id}`, 'DELETE'),
  );
}

export const RELATION_LABEL: Record<GuardianRelation, string> = {
  FATHER: '父親',
  MOTHER: '母親',
  GRANDPARENT: '祖父母',
  GUARDIAN: '監護人',
};

// 後端擋下的情況翻成白話（每一條都是有意義的保護，不是單純的錯誤）。
export function peopleErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'last_owner_cannot_be_disabled':
      return '這是最後一位在職園長，停用後就沒有人能管理園所了。請先指派另一位園長。';
    case 'guardianship_exists':
      return '這位家長已經綁定過這個小孩了。';
    case 'assignment_exists':
      return '這位老師已經帶這個班了。';
    case 'student_not_found':
      return '找不到這個學生。';
    case 'class_not_found':
      return '找不到這個班級。';
    case 'user_not_found':
      return '找不到這個帳號。';
    default:
      return fallback;
  }
}
