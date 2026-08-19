'use client';

import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import { useMyClasses } from '../classes/hooks';
import { useMyStudents } from '../../lib/queries';
import type { AttendanceView, ClassView } from '../../lib/types';
import { schoolToday } from '../../lib/datetime';

// 全園今天的樣子。園長首頁要回答的是「今天全園狀況如何、哪裡需要我」。
//
// **沒有新增後端端點**：後端的出缺勤查詢一次只收一個班（GET /attendance?classId=&date=），
// 所以這裡對每個班各發一次、在前端加總。一間幼兒園通常 3–8 個班，
// 這個數量的並行查詢比為了省幾個請求就動後端划算得多。
//
// 未來班級數變多（20 個班以上）時值得補一個 GET /attendance?date= 的全校版；
// 那時只要改這個 hook，首頁一行都不用動 —— 這正是把它抽出來的理由。

export interface ClassToday {
  classId: string;
  name: string;
  total: number;
  marked: number;
  present: number;
  leave: number;
  absent: number;
  /** 還沒點完。園長要看的就是這個。 */
  unfinished: boolean;
}

export interface SchoolToday {
  classes: ClassView[] | undefined;
  perClass: ClassToday[];
  totals: { students: number; present: number; leave: number; absent: number; marked: number };
  /** 還沒點完名的班。 */
  unfinishedClasses: ClassToday[];
  isLoading: boolean;
}

export function useSchoolToday(): SchoolToday {
  const { data: classes, isLoading: classesLoading } = useMyClasses();
  const { data: students, isLoading: studentsLoading } = useMyStudents();
  const dateIso = `${schoolToday()}T00:00:00.000Z`;

  const results = useQueries({
    queries: (classes ?? []).map((c) => ({
      // key 與 useClassAttendance 完全一致 —— 點名頁改過之後這裡自動看到新資料，
      // 不會出現「園長看到的數字和老師剛剛點的不一樣」。
      queryKey: ['attendance', 'class', c.id, dateIso],
      queryFn: () =>
        apiGet<AttendanceView[]>(
          `/api/attendance?classId=${encodeURIComponent(c.id)}&date=${encodeURIComponent(dateIso)}`,
        ),
    })),
  });

  const perClass: ClassToday[] = (classes ?? []).map((c, i) => {
    const rows = results[i]?.data ?? [];
    const total = (students ?? []).filter((s) => s.classId === c.id).length;
    const present = rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const leave = rows.filter((r) => r.status === 'LEAVE').length;
    const absent = rows.filter((r) => r.status === 'ABSENT').length;
    return {
      classId: c.id,
      name: c.name,
      total,
      marked: rows.length,
      present,
      leave,
      absent,
      // 沒有學生的班不算「還沒點完」—— 那是空班，不是老師漏了。
      unfinished: total > 0 && rows.length < total,
    };
  });

  const totals = perClass.reduce(
    (acc, c) => ({
      students: acc.students + c.total,
      present: acc.present + c.present,
      leave: acc.leave + c.leave,
      absent: acc.absent + c.absent,
      marked: acc.marked + c.marked,
    }),
    { students: 0, present: 0, leave: 0, absent: 0, marked: 0 },
  );

  return {
    classes,
    perClass,
    totals,
    unfinishedClasses: perClass.filter((c) => c.unfinished),
    isLoading: classesLoading || studentsLoading || results.some((r) => r.isLoading),
  };
}
