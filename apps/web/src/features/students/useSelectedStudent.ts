'use client';

import { useEffect, useState } from 'react';
import { useMyStudents } from '../../lib/queries';
import type { StudentView } from '../../lib/auth';

interface SelectedStudent {
  students: StudentView[] | undefined;
  studentId: string | undefined;
  setStudentId: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
}

// 共用:載入可查看學生 + 預設選第一位（家長/老師/園長皆用;後端已 scope 過濾）。
export function useSelectedStudent(): SelectedStudent {
  const { data: students, isLoading, isError } = useMyStudents();
  const [studentId, setStudentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const first = students?.[0];
    if (first && !studentId) {
      setStudentId(first.id);
    }
  }, [students, studentId]);

  return { students, studentId, setStudentId, isLoading, isError };
}

// 單一學生的名字（用來組頁面標題）。名單還沒回來時回 undefined —— 由呼叫端決定先顯示什麼，
// 不要在這裡塞一個假名字。
export function useStudentName(studentId: string): string | undefined {
  const { data: students } = useMyStudents();
  return students?.find((s) => s.id === studentId)?.name;
}
