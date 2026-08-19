'use client';

import { useSession } from '../../lib/session';
import { usePublicConfig } from '../../lib/queries';
import { useVisibleStudents } from '../students/useSelectedStudent';
import { roleFlags } from '../../lib/roles';
import { useSelectedClass } from '../classes/hooks';
import { useClassAttendance } from '../attendance/hooks';
import { useClassBook, hasContent } from '../communication-book/hooks';
import { useClassPendingLeaves } from '../leave/hooks';
import { EmptyState, SectionHead, StateCard, Tile } from '../../components/ui';
import { schoolToday } from '../../lib/datetime';

// 班導師首頁。**一句話 + 一份會變短的待辦。**
//
// 導師的世界是縱深：一個班、幾十個孩子、今天。他要的不是功能清單，
// 是「我今天還有什麼沒做」——所以這一頁只有兩種東西：還沒做完的（磚塊 + 數字）
// 與已經做完的（一行灰字）。全部做完時整頁會空掉，那正是它該有的樣子。
//
// 數字全部由既有查詢在前端算出來，沒有新增後端端點：
//   點名 = 班級名單 − 今天已有出缺勤紀錄的人
//   聯絡簿 = 班級名單 − 今天已經有內容的紀錄
//   請假 = 這一班的待審清單長度

export function TeacherHome() {
  const { user } = useSession();
  const { data: config } = usePublicConfig();
  const flags = roleFlags(user.roles);
  const { classes, classId, isLoading: classesLoading } = useSelectedClass();

  const todayKey = schoolToday();
  const dateIso = `${todayKey}T00:00:00.000Z`;

  const { data: students } = useVisibleStudents();
  const { data: attendance } = useClassAttendance(classId, dateIso);
  const { data: book } = useClassBook(classId, dateIso);
  const { data: pendingLeaves } = useClassPendingLeaves(classId);

  const roster = (students ?? []).filter((s) => s.classId === classId);
  const marked = new Set((attendance ?? []).map((a) => a.studentId));
  const written = new Set((book ?? []).filter((e) => hasContent(e)).map((e) => e.studentId));

  const unmarked = roster.filter((s) => !marked.has(s.id)).length;
  const unwritten = roster.filter((s) => !written.has(s.id)).length;
  const toReview = pendingLeaves?.length ?? 0;

  const currentClass = classes?.find((c) => c.id === classId);
  const busOn = Boolean(config?.featureFlags?.bus) && flags.canMarkBusRide;

  // 「還有幾件事」＝還有動作要做的類別數，不是總筆數。
  // 老師關心的是「我還要去幾個地方」，不是「總共還有 37 個小動作」。
  const todo = [unmarked > 0, unwritten > 0, toReview > 0].filter(Boolean).length;

  if (!classesLoading && classes && classes.length === 0) {
    return <EmptyState title="你目前沒有帶班級" hint="請園所指派班級後，這裡就會出現今天的待辦" />;
  }

  return (
    <div className="flex flex-col gap-7">
      <StateCard
        eyebrow={currentClass ? `${currentClass.name} · ${user.displayName}` : user.displayName}
        headline={todo > 0 ? `今天還有 ${todo} 件事` : '今天都做完了'}
        detail={
          roster.length > 0
            ? `班上 ${roster.length} 位小朋友`
            : '這個班還沒有學生'
        }
        tone={todo > 0 ? 'brand' : 'good'}
      />

      <section className="flex flex-col gap-2">
        {unmarked > 0 && (
          <Tile
            icon="check"
            title="點名"
            detail={`還有 ${unmarked} 人沒點`}
            count={unmarked}
            tone="brand"
            href="/liff/attendance"
          />
        )}
        {unwritten > 0 && (
          <Tile
            icon="book"
            title="聯絡簿"
            detail={`${unwritten} 本還沒寫`}
            count={unwritten}
            tone="wait"
            href="/liff/communication-book"
          />
        )}
        {toReview > 0 && (
          <Tile
            icon="doc"
            title="請假審核"
            detail={`${toReview} 件等你決定`}
            count={toReview}
            tone="note"
            href="/liff/leave"
          />
        )}
        {busOn && (
          <Tile icon="bus" title="娃娃車" detail="今天的上下車點名" tone="neutral" href="/liff/bus" />
        )}
      </section>

      {/* 做完的事不留在原位變灰，收成一行 —— 首頁的價值在於它會變短。 */}
      {todo < 3 && roster.length > 0 && (
        <section>
          <SectionHead title="今天已完成" weight="review" />
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            {unmarked === 0 && <li>✓ 全班都點名了</li>}
            {unwritten === 0 && <li>✓ 聯絡簿都寫好了</li>}
            {toReview === 0 && <li>✓ 沒有等你審核的請假</li>}
          </ul>
        </section>
      )}

      <section>
        <SectionHead title="其他" description="不是每天要看，但需要時在這裡" weight="review" />
        <div className="flex flex-col gap-2">
          <Tile
            icon="user"
            title="我的班"
            detail={currentClass ? `${currentClass.name} · ${roster.length} 位小朋友` : '班級名單'}
            tone="neutral"
            href="/liff/class"
          />
          {flags.canAnnounce && (
            <Tile
              icon="mega"
              title="公告"
              detail="發布給你帶的班級"
              tone="neutral"
              href="/liff/announcement"
            />
          )}
        </div>
      </section>
    </div>
  );
}
