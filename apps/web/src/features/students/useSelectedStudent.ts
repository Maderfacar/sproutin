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
