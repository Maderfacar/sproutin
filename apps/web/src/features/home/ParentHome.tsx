'use client';

import Link from 'next/link';
import { selectDashboardCards } from '@sproutin/shared';
import { useSession } from '../../lib/session';
import { usePublicConfig } from '../../lib/queries';
import { useSelectedStudent } from '../students/useSelectedStudent';
import { useAttendance } from '../attendance/hooks';
import { useAnnouncements } from '../announcement/hooks';
import { useStudentBook } from '../communication-book/hooks';
import { useMyBus } from '../bus/hooks';
import { cardMeta } from '../dashboard/cards';
import { HomeHero } from './HomeHero';
import { Icon } from '../../components/Icon';
import { Button, EmptyState, SectionHead, Segmented, StateCard, Tile } from '../../components/ui';
import type { Tone } from '../../components/ui';
import { formatDate, formatTime, schoolHour, schoolToday } from '../../lib/datetime';
import type { AttendanceStatus } from '../../lib/types';

// 家長首頁。**一頁只回答一個問題：我小孩今天怎麼樣。**
//
// 舊版是七個區塊、六張同樣大的功能卡，卡片名字用的是資料庫的分類（出缺勤／聯絡簿／娃娃車）
// —— 家長腦中的問題是「今天到了沒」「今天過得如何」，名字對不上就得先猜、點進去、
// 發現不對再退出來。改版之後：
//
//   封面 → 今天的答案（一張狀態卡）→ 老師今天寫的 → 一顆主要按鈕（請假）
//   → 娃娃車與公告各一行 → 其餘入口收在最下面
//
// 本月出席統計刻意搬走（移到 /liff/attendance）：那是「查詢」不是「今天」，
// 留在首頁會和答案搶同一個位置。

function greeting(): string {
  const h = schoolHour();
  if (h < 11) return '早安';
  if (h < 18) return '午安';
  return '晚安';
}

function todayLabel(): string {
  const d = new Date();
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日 · 週${week}`;
}

// 狀態卡上的那句答案。用家長會講的話，不用系統的狀態名。
const ANSWER: Record<AttendanceStatus, { headline: string; detail: string; tone: Tone }> = {
  PRESENT: { headline: '已到校', detail: '老師已完成點名', tone: 'good' },
  LATE: { headline: '已到校', detail: '今天晚了一點到', tone: 'note' },
  LEAVE: { headline: '今天請假', detail: '學校已經知道了', tone: 'wait' },
  ABSENT: { headline: '今天沒到校', detail: '如果不是預期中的，請跟老師聯絡', tone: 'stop' },
};

export function ParentHome() {
  const { user } = useSession();
  const { data: config } = usePublicConfig();
  const { students, studentId, setStudentId } = useSelectedStudent();

  const student = students?.find((s) => s.id === studentId);
  const todayKey = schoolToday();
  const todayIso = `${todayKey}T00:00:00.000Z`;

  const { data: attendance } = useAttendance(studentId);
  const { data: announcements } = useAnnouncements();
  const { data: bookEntries } = useStudentBook(studentId, { from: todayIso, to: todayIso });
  const { data: myBus } = useMyBus(config?.featureFlags?.bus ? studentId : undefined);

  const todayRec = attendance?.find((a) => a.date.slice(0, 10) === todayKey);
  const todayBook = bookEntries?.[0];
  const answer = todayRec ? ANSWER[todayRec.status] : null;

  // 到校時間以聯絡簿為準（老師實際填的），沒有才退回一般說法 —— 不要編一個時間出來。
  const arrivalDetail =
    todayRec && (todayRec.status === 'PRESENT' || todayRec.status === 'LATE') && todayBook?.arrivalTime
      ? `早上 ${todayBook.arrivalTime} 進教室`
      : answer?.detail;

  const latest = announcements
    ? [...announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : undefined;

  // 娃娃車：下午那一趟才是家長現在關心的（早上那趟通常已經發生了）。
  const busRide = myBus?.ridesAfternoon ? myBus.afternoon : null;
  const busLine = myBus?.ridesAfternoon
    ? busRide?.status === 'ALIGHTED'
      ? `已下車 ${busRide.alightedAt ? formatTime(busRide.alightedAt) : ''}`.trim()
      : busRide?.status === 'BOARDED'
        ? `已上車 ${busRide.boardedAt ? formatTime(busRide.boardedAt) : ''}`.trim()
        : myBus.afternoonDepart
          ? `下午 ${myBus.afternoonDepart} 從學校出發`
          : '今天有這一趟'
    : null;

  // 首頁已經給了聯絡簿與請假各自的入口（底部頁籤也有），不要在下面再列一次。
  const cards = selectDashboardCards(
    user.roles.map((r) => r.role),
    config?.featureFlags ?? {},
    config?.cardOrder ?? [],
  ).filter((c) => c.id !== 'communication-book' && c.id !== 'leave');

  const hasStudent = Boolean(students && students.length > 0);

  return (
    <div className="flex flex-col gap-7">
      <HomeHero
        greeting={greeting()}
        displayName={user.displayName}
        dateLabel={todayLabel()}
        // 兼校方身分的人切過來時，這一行是他唯一看得出「我現在是誰的家長」的地方。
        context={student ? `${student.name} 的家長` : undefined}
      />

      {/* 兩個以上的孩子才需要選。原生下拉已退役 —— 名字直接攤開，一眼看得到有誰。 */}
      {students && students.length > 1 && (
        <Segmented
          label="選擇孩子"
          options={students.map((s) => ({ value: s.id, label: s.name }))}
          value={studentId}
          onChange={setStudentId}
        />
      )}

      {hasStudent ? (
        <>
          <StateCard
            eyebrow={student ? `${student.name} · 今天` : '今天'}
            headline={answer?.headline ?? '還沒點名'}
            detail={arrivalDetail ?? '老師點完名這裡就會更新'}
            tone={answer?.tone ?? 'neutral'}
          />

          {/* 老師今天寫的。沒寫就整塊不出現 —— 空的卡片只會讓人以為壞掉。 */}
          {studentId && todayBook?.teacherNote && (
            <Link
              href={`/liff/communication-book/${studentId}`}
              className="tappable rounded-tile border border-line-strong bg-surface p-5 shadow-soft"
            >
              <p className="text-2xs font-semibold text-ink-mute">老師今天寫的</p>
              <p className="mt-2 line-clamp-3 text-base leading-relaxed text-ink">
                {todayBook.teacherNote}
              </p>
              <p className="mt-3 flex items-center gap-1 text-2xs font-bold text-brand-primary">
                看完整聯絡簿、回覆老師
                <Icon name="chev" className="h-3 w-3" />
              </p>
            </Link>
          )}

          {/* 這一頁唯一的主要按鈕。家長真正會「做」的事只有請假。 */}
          <Button variant="primary" href="/liff/leave">
            <Icon name="doc" className="h-5 w-5" />
            我要幫孩子請假
          </Button>

          {busLine && (
            <Tile icon="bus" title="娃娃車" detail={busLine} tone="neutral" href="/liff/bus" />
          )}

          {latest && (
            <Tile
              icon="mega"
              title={latest.title}
              detail={`${latest.scope === 'SCHOOL' ? '全校公告' : '班級公告'} · ${formatDate(latest.createdAt)}`}
              tone="neutral"
              href="/liff/announcement"
            />
          )}
        </>
      ) : (
        <EmptyState
          title="還沒有連結到孩子的資料"
          hint="請跟園所確認你的 LINE 帳號是不是已經綁定好了"
        />
      )}

      {cards.length > 0 && (
        <section>
          <SectionHead
            title="其他"
            description="不是每天要看，但需要時在這裡"
            weight="review"
          />
          <div className="flex flex-col gap-2">
            {cards.map((card) => {
              const meta = cardMeta(card.id);
              return (
                <Tile
                  key={card.id}
                  icon={meta.icon}
                  title={meta.title}
                  detail={meta.enabled ? meta.description : '即將推出'}
                  tone="neutral"
                  href={meta.href}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
