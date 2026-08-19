'use client';

import { useEffect, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMyStudents, useMyGuardianStudents, useMyTeachingStudents } from '../../lib/queries';
import { useActivePersona } from '../../lib/usePersona';
import type { StudentView } from '../../lib/auth';

// 現在這個身分「看得到哪些學生」。**全站只有這一個地方決定學生的資料範圍。**
//
// 這是踩過兩次同一個坑之後的結論（Human Owner 2026-08-20）：
//   ① 園長兼家長切到家長身分 → 「選擇孩子」列出全校 125 位
//   ② 只帶一班的導師（同時也是園長）→ 點名與聯絡簿看得到別班的孩子
//
// 兩次的根因一樣：`GET /me/students` 回的是**角色聯集**，而畫面已經切成一次只用一種身分。
// UI 切開了但資料沒切開，比不切更危險 —— 使用者以為自己在一個受限的世界裡。
//
//   家長 → 只有我監護的小孩（relation=GUARDIAN）
//   導師 → 只有我實際帶的班上的孩子（relation=TEACHING）
//   園長／行政 → 角色聯集（本來就該看全校）
//   隨車老師 → 角色聯集（他的範圍由路線決定，不是班級）
//
// 縮小一律在**後端**做：只在前端過濾等於整份名單仍然送到了瀏覽器。
// 而且只縮小不放大 —— 沒有那層關係就是空的，就算他是園長。
//
// **新頁面請一律用這個 hook，不要直接呼叫 useMyStudents()**，
// 否則就會再犯一次同樣的錯。
export function useVisibleStudents(): UseQueryResult<StudentView[]> {
  const { persona } = useActivePersona();
  const isParent = persona === 'parent';
  const isTeacher = persona === 'teacher';

  // 三個 hook 都要無條件呼叫（Rules of Hooks），用 enabled 決定誰真的去抓 ——
  // 否則家長身分還是會在背景把全校名單抓下來。
  const union = useMyStudents(!isParent && !isTeacher);
  const mine = useMyGuardianStudents(isParent);
  const teaching = useMyTeachingStudents(isTeacher);

  if (isParent) return mine;
  if (isTeacher) return teaching;
  return union;
}

interface SelectedStudent {
  students: StudentView[] | undefined;
  studentId: string | undefined;
  setStudentId: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
}

// 共用：載入可查看的學生 + 預設選第一位（範圍見上面 useVisibleStudents）。
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
