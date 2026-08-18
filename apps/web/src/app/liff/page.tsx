'use client';

import Link from 'next/link';
import { selectDashboardCards } from '@sproutin/shared';
import { useSession } from '../../lib/session';
import { usePublicConfig } from '../../lib/queries';
import { useSelectedStudent } from '../../features/students/useSelectedStudent';
import { useAttendance } from '../../features/attendance/hooks';
import { useAnnouncements } from '../../features/announcement/hooks';
import { useStudentBook } from '../../features/communication-book/hooks';
import { MOOD_LABEL } from '../../features/communication-book/labels';
import { cardMeta } from '../../features/dashboard/cards';
import { HomeHero } from '../../features/home/HomeHero';
import { Icon } from '../../components/Icon';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return '早安';
  if (h < 18) return '午安';
  return '晚安';
}

function todayLabel(): string {
  const d = new Date();
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日 · 週${week}`;
}

const ATT: Record<string, { text: string; note: string; brand: boolean }> = {
  PRESENT: { text: '已到校', note: '今天狀態良好', brand: true },
  LATE: { text: '已到校（遲到）', note: '今日稍晚到校', brand: true },
  LEAVE: { text: '今日請假', note: '已完成請假', brand: false },
  ABSENT: { text: '未到校', note: '今日缺席', brand: false },
};

// 清葉家長首頁：今日狀態 → 本月統計 → 今日聯絡簿 → 最新公告 → 快速功能。
// 公告排在快速功能之前（Human Owner 2026-08-18）：公告是「今天有沒有新的事」,
// 快速功能是常駐入口 —— 會變的東西要先看到。
// 有學生者（家長 / 有監護的帳號）顯示今日/統計;純教職員顯示快速入口 + 公告。
export default function DashboardPage() {
  const { user } = useSession();
  const { data: config } = usePublicConfig();
  const { students, studentId, setStudentId } = useSelectedStudent();
  const { data: attendance } = useAttendance(studentId);
  const { data: announcements } = useAnnouncements();

  const roles = user.roles.map((r) => r.role);
  const cards = selectDashboardCards(roles, config?.featureFlags ?? {}, config?.cardOrder ?? []);
  const student = students?.find((s) => s.id === studentId);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayIso = `${todayKey}T00:00:00.000Z`;
  const { data: bookEntries } = useStudentBook(studentId, { from: todayIso, to: todayIso });
  const todayBook = bookEntries?.[0];
  const monthKey = todayKey.slice(0, 7);
  const todayRec = attendance?.find((a) => a.date.slice(0, 10) === todayKey);
  const monthRecs = attendance?.filter((a) => a.date.slice(0, 7) === monthKey) ?? [];
  const present = monthRecs.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const leaveCount = monthRecs.filter((a) => a.status === 'LEAVE').length;
  const rate = monthRecs.length > 0 ? Math.round((present / monthRecs.length) * 100) : null;
  const att = todayRec ? ATT[todayRec.status] : null;

  const latest = announcements
    ? [...announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : undefined;

  return (
    <div className="space-y-7">
      {/* 園所門面 + 問候（只在首頁） */}
      <HomeHero greeting={greeting()} displayName={user.displayName} dateLabel={todayLabel()} />

      <section className="rise-in">
        {students && students.length > 0 && (
          <div className="flex items-center gap-3 border-b border-line py-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: 'var(--brand-primary)' }}
              aria-hidden
            >
              {student?.name.charAt(0) ?? '生'}
            </span>
            {students.length > 1 ? (
              <select
                aria-label="切換學生"
                value={studentId ?? ''}
                onChange={(e) => setStudentId(e.target.value)}
                className="bg-transparent text-sm font-bold text-ink outline-none"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-bold text-ink">{student?.name}</span>
            )}
            <span className="ml-auto text-xs text-ink-soft">在學中</span>
          </div>
        )}
      </section>

      {/* 今日狀態 + 本月統計 */}
      {students && students.length > 0 && (
        <section className="rise-in card p-5" style={{ animationDelay: '0.05s' }}>
          <p className="eyebrow">今日</p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--brand-primary) 14%, var(--surface))',
                color: 'var(--brand-primary)',
              }}
            >
              <Icon name={att && !att.brand ? 'doc' : 'check'} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-bold text-ink">{att ? att.text : '尚未點名'}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {att ? att.note : '老師點名後會更新'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex border-t border-line pt-4">
            {[
              { b: present, i: '出席' },
              { b: leaveCount, i: '請假' },
              { b: rate === null ? '—' : `${rate}%`, i: '出席率' },
            ].map((s, idx) => (
              <div
                key={s.i}
                className={`flex-1 text-center ${idx > 0 ? 'border-l border-line' : ''}`}
              >
                <p className="font-serif text-2xl font-semibold text-ink tabular-nums">{s.b}</p>
                <p className="text-xs text-ink-soft">{s.i}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 今日聯絡簿摘要（老師送出後才有;點進去看全文與親師對話） */}
      {studentId && todayBook && (
        <section className="rise-in" style={{ animationDelay: '0.075s' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">今日聯絡簿</p>
            <Link
              href={`/liff/communication-book/${studentId}`}
              className="flex items-center gap-0.5 text-xs font-bold text-brand-primary"
            >
              看全文
              <Icon name="chev" className="h-3 w-3" />
            </Link>
          </div>
          <Link href={`/liff/communication-book/${studentId}`} className="tappable block border-t border-line pt-3">
            <p className="text-sm text-ink-soft">
              {[
                todayBook.arrivalTime ? `到校 ${todayBook.arrivalTime}` : null,
                todayBook.mood ? MOOD_LABEL[todayBook.mood] : null,
                todayBook.symptoms.length > 0 || todayBook.temperature !== null ? '健康需注意' : null,
                todayBook.teacherNote ? '老師有留言' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {todayBook.teacherNote && (
              <p className="mt-1 line-clamp-2 font-serif text-base leading-snug text-ink">
                {todayBook.teacherNote}
              </p>
            )}
          </Link>
        </section>
      )}

      {/* 最新公告 */}
      {latest && (
        <section className="rise-in" style={{ animationDelay: '0.1s' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">最新公告</p>
            <Link
              href="/liff/announcement"
              className="flex items-center gap-0.5 text-xs font-bold text-brand-primary"
            >
              全部
              <Icon name="chev" className="h-3 w-3" />
            </Link>
          </div>
          <Link href="/liff/announcement" className="tappable block">
            <p className="text-xs text-ink-soft">
              {latest.scope === 'SCHOOL' ? '全校' : '班級'} ·{' '}
              {new Date(latest.createdAt).toLocaleDateString('zh-TW')}
            </p>
            <p className="mt-1 font-serif text-base font-semibold leading-snug text-ink">
              {latest.title}
            </p>
          </Link>
        </section>
      )}
      {/* 快速功能 */}
      <section className="rise-in" style={{ animationDelay: '0.15s' }}>
        <p className="eyebrow mb-1">快速功能</p>
        <div className="grid grid-cols-2 border-t border-line">
          {cards.map((card) => {
            const meta = cardMeta(card.id);
            const rowClass =
              'tappable flex items-center gap-3 border-b border-line py-4 [&:nth-child(odd)]:border-r [&:nth-child(odd)]:pr-4 [&:nth-child(even)]:pl-4';
            const inner = (
              <>
                <Icon name={meta.icon} className="h-5 w-5 shrink-0" />
                {/* 「即將推出」放在標題底下而不是右邊：字級放大時（lib/fontScale）
                    兩者在窄手機上搶不到同一行，標題會被擠成怪斷行。 */}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{meta.title}</span>
                  {!meta.enabled && (
                    <span className="mt-0.5 block text-3xs text-ink-soft">即將推出</span>
                  )}
                </span>
              </>
            );
            // 尚未完工的功能仍可點進預告頁（讓人知道接下來會有這功能），只是視覺上收斂。
            return meta.href ? (
              <Link
                key={card.id}
                href={meta.href}
                className={`${rowClass} hover:bg-black/[0.015] ${
                  meta.enabled ? 'text-brand-primary' : 'text-ink-soft'
                }`}
              >
                {inner}
              </Link>
            ) : (
              <div key={card.id} className={`${rowClass} text-ink-soft`} aria-disabled>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
