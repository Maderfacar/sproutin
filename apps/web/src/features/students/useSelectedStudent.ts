'use client';

import { useEffect, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMyStudents, useMyGuardianStudents } from '../../lib/queries';
import { useActivePersona } from '../../lib/usePersona';
import type { StudentView } from '../../lib/auth';

// 現在這個身分「看得到哪些學生」。
//
// **名單依身分而不同**（Human Owner 2026-08-20 回報）：
// 家長身分只給「我監護的小孩」，其餘身分給角色聯集（老師自班 / 園長全校）。
//
// 原本一律用聯集版，於是園長兼家長的人切到家長身分之後，「選擇孩子」列出全校 125 位，
// 首頁還把排序第一個陌生小孩當成他的孩子 —— 那不是版面問題，是**資料範圍**問題。
// 所以縮小是在後端做的（`GET /me/students?relation=GUARDIAN`）；
// 只在前端過濾等於整份名單仍然送到了瀏覽器。
//
// 授權沒有被放寬：這條路只縮小不放大，沒有監護關係就是空的，就算他是園長。
//
// 兩個 hook 都無條件呼叫（Rules of Hooks），用 enabled 決定誰真的去抓 ——
// 否則家長身分還是會在背景把全校名單抓下來。
export function useVisibleStudents(): UseQueryResult<StudentView[]> {
  const { persona } = useActivePersona();
  const isParentView = persona === 'parent';
  const union = useMyStudents(!isParentView);
  const mine = useMyGuardianStudents(isParentView);
  return isParentView ? mine : union;
}

interface SelectedStudent {
  students: StudentView[] | undefined;
  studentId: string | undefined;
  setStudentId: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
}

// 共用：載入可查看的學生 + 預設選第一位（見上面 useVisibleStudents 的範圍說明）。
export function useSelectedStudent(): SelectedStudent {
  const { data: students, isLoading, isError } = useVisibleStudents();
  const [studentId, setStudentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const first = students?.[0];
    // 換身分之後名單會整個換掉 —— 舊的選擇必須失效，否則家長身分會停在
    // 剛剛以老師身分選的那個學生（那正是「切過去看到別班孩子」的第二個成因）。
    if (studentId && students && !students.some((s) => s.id === studentId)) {
      setStudentId(first?.id);
      return;
    }
    if (first && !studentId) {
      setStudentId(first.id);
    }
  }, [students, studentId]);

  return { students, studentId, setStudentId, isLoading, isError };
}

// 單一學生的名字（用來組頁面標題）。名單還沒回來時回 undefined —— 由呼叫端決定先顯示什麼，
// 不要在這裡塞一個假名字。範圍與 useSelectedStudent 一致。
export function useStudentName(studentId: string): string | undefined {
  const { data: students } = useVisibleStudents();
  return students?.find((s) => s.id === studentId)?.name;
}
