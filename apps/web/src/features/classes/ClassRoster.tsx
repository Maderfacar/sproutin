'use client';

import Link from 'next/link';
import { useSelectedClass } from './hooks';
import { useMyStudents } from '../../lib/queries';
import { useClassAttendance } from '../attendance/hooks';
import { useClassBook, hasContent } from '../communication-book/hooks';
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_TONE } from '../attendance/labels';
import { Avatar, Badge, EmptyState, Row, Segmented, SkeletonRows } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { schoolToday } from '../../lib/datetime';

// 導師的「我的班」：一份名單，每個孩子右邊是他今天的狀態。
//
// 這一頁不是拿來做事的，是拿來**找人**的 —— 老師要點進某個孩子看聯絡簿、
// 或想知道「今天誰請假」。所以不放任何按鈕，整列就是通往那個孩子的入口。

export function ClassRoster() {
  const { classes, classId, setClassId, isLoading: classesLoading } = useSelectedClass();
  const todayIso = `${schoolToday()}T00:00:00.000Z`;

  const { data: students, isLoading } = useMyStudents();
  const { data: attendance } = useClassAttendance(classId, todayIso);
  const { data: book } = useClassBook(classId, todayIso);

  const roster = (students ?? []).filter((s) => s.classId === classId);
  const statusOf = new Map((attendance ?? []).map((a) => [a.studentId, a.status]));
  const written = new Set((book ?? []).filter((e) => hasContent(e)).map((e) => e.studentId));

  if (classesLoading || isLoading) {
    return <SkeletonRows rows={6} />;
  }
  if (classes && classes.length === 0) {
    return <EmptyState title="你目前沒有帶班級" hint="請園所指派班級後再回來" />;
  }

  return (
    <div className="flex flex-col gap-5">
      {classes && classes.length > 1 && classes.length <= 3 && (
        <Segmented
          label="選擇班級"
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={setClassId}
        />
      )}

      {roster.length === 0 ? (
        <EmptyState title="這個班還沒有學生" hint="請先在學生管理裡把孩子加進班級" />
      ) : (
        <ul>
          {roster.map((s) => {
            const status = statusOf.get(s.id);
            return (
              <li key={s.id}>
                <Link href={`/liff/communication-book/${s.id}`} className="tappable block">
                  <Row
                    lead={<Avatar name={s.name} />}
                    title={s.name}
                    detail={written.has(s.id) ? '今天的聯絡簿已經寫了' : '今天的聯絡簿還沒寫'}
                    trailing={
                      <span className="flex items-center gap-2">
                        {status ? (
                          <Badge tone={ATTENDANCE_STATUS_TONE[status]}>
                            {ATTENDANCE_STATUS_LABEL[status].label}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">還沒點名</Badge>
                        )}
                        <Icon name="chev" className="h-4 w-4 shrink-0 text-ink-mute" />
                      </span>
                    }
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
