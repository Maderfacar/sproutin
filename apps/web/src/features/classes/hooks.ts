'use client';

import { useEffect, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { ClassView } from '../../lib/types';

// 我的班級（staff;後端 scope 過濾）。
export function useMyClasses(): UseQueryResult<ClassView[]> {
  const { accessToken } = useSession();
  return useQuery({
    queryKey: ['classes'],
    queryFn: () => apiGet<ClassView[]>('/api/classes', accessToken),
  });
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
