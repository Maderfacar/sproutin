'use client';

import { useSession } from '../../lib/session';
import { usePublicConfig } from '../../lib/queries';
import { roleFlags } from '../../lib/roles';
import { useSchoolPendingLeaves } from '../leave/hooks';
import { useSchoolToday } from './useSchoolToday';
import { EmptyState, SectionHead, SkeletonCards, StateCard, Tile } from '../../components/ui';
import type { IconName } from '../../components/Icon';

// 園長／行政首頁。**廣度：全園的數字與名單。**
//
// 導師的首頁問「我這一班今天還有什麼沒做」，園長的首頁問「今天全園怎麼樣、哪裡需要我」——
// 這是兩個不同的問題，所以是兩頁，不是同一頁換個標題。
//
// 版面順序刻意是：一句話 → 三個數字 → 需要我處理的 → 管理。
// 「管理」放最後，因為園所設定是設好就不太動的東西，天天擺在最上面只是佔位置。

interface ManageEntry {
  href: string;
  icon: IconName;
  title: string;
  detail: string;
}

function manageEntries(flags: ReturnType<typeof roleFlags>, hasBus: boolean): ManageEntry[] {
  const entries: ManageEntry[] = [];
  if (flags.canManageSchool) {
    entries.push(
      { href: '/liff/admin/students', icon: 'heart', title: '學生', detail: '新增、換班、在學狀態' },
      { href: '/liff/admin/classes', icon: 'home', title: '班級', detail: '班級與導師指派' },
      { href: '/liff/admin/people', icon: 'user', title: '人員與綁定', detail: '帳號、家長綁定碼' },
      { href: '/liff/admin/roles', icon: 'shield', title: '權限', detail: '一頁看完誰有什麼身分' },
      { href: '/liff/admin/messages', icon: 'send', title: '發送訊息', detail: '送出後不可收回' },
      { href: '/liff/admin/appearance', icon: 'image', title: '園所外觀', detail: 'LINE 選單、園名、顏色、封面' },
    );
    if (hasBus) {
      entries.push({ href: '/liff/admin/bus', icon: 'bus', title: '娃娃車設定', detail: '路線、接送點、隨車老師' });
    }
  }
  if (flags.canViewAudit) {
    entries.push({ href: '/liff/audit', icon: 'shield', title: '稽核紀錄', detail: '誰在什麼時候改了什麼' });
  }
  return entries;
}

export function AdminHome() {
  const { user } = useSession();
  const { data: config } = usePublicConfig();
  const flags = roleFlags(user.roles);
  const { classes, perClass, totals, unfinishedClasses, isLoading } = useSchoolToday();
  const { data: pendingLeaves } = useSchoolPendingLeaves(flags.canViewSchoolLeaves);

  const toReview = pendingLeaves?.length ?? 0;
  const manage = manageEntries(flags, Boolean(config?.featureFlags?.bus));
  const needsMe = unfinishedClasses.length + (toReview > 0 ? 1 : 0);

  if (isLoading) {
    return <SkeletonCards cards={3} />;
  }
  if (classes && classes.length === 0) {
    return (
      <EmptyState
        title="還沒有建立班級"
        hint="先到「班級」建一個班，這裡就會出現今天的全園狀況"
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <StateCard
        eyebrow="全園 · 今天"
        headline={`${totals.present} 位到校`}
        detail={
          totals.students > 0
            ? `全園 ${totals.students} 位，已點名 ${totals.marked} 位`
            : '還沒有學生資料'
        }
        tone={needsMe > 0 ? 'brand' : 'good'}
      />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="請假" value={totals.leave} tone="wait" />
        <Stat label="沒到校" value={totals.absent} tone={totals.absent > 0 ? 'stop' : 'neutral'} />
        <Stat
          label="未點名班級"
          value={unfinishedClasses.length}
          tone={unfinishedClasses.length > 0 ? 'note' : 'neutral'}
        />
      </div>

      {needsMe > 0 ? (
        <section>
          <SectionHead title="需要你處理" />
          <div className="flex flex-col gap-2">
            {unfinishedClasses.map((c) => (
              <Tile
                key={c.classId}
                icon="check"
                title={`${c.name}還沒點完名`}
                detail={`${c.marked} / ${c.total} 位`}
                count={c.total - c.marked}
                tone="note"
                href="/liff/attendance"
              />
            ))}
            {toReview > 0 && (
              <Tile
                icon="doc"
                title="請假等你決定"
                detail="全校送上來的申請"
                count={toReview}
                tone="wait"
                href="/liff/leave"
              />
            )}
          </div>
        </section>
      ) : (
        <section>
          <SectionHead title="今天沒有需要你處理的事" weight="review" />
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            <li>✓ 每個班都點完名了</li>
            <li>✓ 沒有等審核的請假</li>
          </ul>
        </section>
      )}

      {/* 園長也會需要直接開點名與聯絡簿（代課、老師請假時），而底部只有四格放不下
          —— 所以入口放在這裡（Human Owner 2026-08-20 回報：園長身分找不到聯絡簿）。 */}
      <section>
        <SectionHead title="每天的事" description="老師請假或代課時你也用得到" weight="review" />
        <div className="flex flex-col gap-2">
          <Tile icon="check" title="點名" detail="選一個班，補今天的出缺勤" href="/liff/attendance" />
          <Tile
            icon="book"
            title="聯絡簿"
            detail="選一個班，填今天的聯絡簿"
            tone="wait"
            href="/liff/communication-book"
          />
        </div>
      </section>

      {perClass.length > 0 && (
        <section>
          <SectionHead title="各班今天" description="點進去看那一班的點名" weight="review" />
          <ul>
            {perClass.map((c) => (
              <li
                key={c.classId}
                className="flex min-h-touch items-center gap-3 border-b border-line py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{c.name}</span>
                <span className="text-2xs tabular-nums text-ink-soft">
                  到校 {c.present}
                  {c.leave > 0 && ` · 請假 ${c.leave}`}
                  {c.absent > 0 && ` · 缺席 ${c.absent}`}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-semibold ${
                    c.unfinished
                      ? 'border border-note-edge bg-note-wash text-note-text'
                      : 'border border-good-edge bg-good-wash text-good-text'
                  }`}
                >
                  {c.unfinished ? `差 ${c.total - c.marked} 位` : '已完成'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {manage.length > 0 && (
        <section>
          <SectionHead title="管理" description="設定好就不太需要再動的東西" weight="review" />
          <div className="flex flex-col gap-2">
            {manage.map((e) => (
              <Tile
                key={e.href}
                icon={e.icon}
                title={e.title}
                detail={e.detail}
                tone="neutral"
                href={e.href}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'wait' | 'stop' | 'note' | 'neutral';
}) {
  const skin =
    tone === 'wait'
      ? 'bg-wait-wash text-wait-text'
      : tone === 'stop'
        ? 'bg-stop-wash text-stop-text'
        : tone === 'note'
          ? 'bg-note-wash text-note-text'
          : 'bg-surface-sunk text-ink-soft';
  return (
    <div className={`rounded-card px-3 py-3 ${skin}`}>
      <p className="text-2xs font-semibold opacity-80">{label}</p>
      <p className="mt-0.5 font-serif text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
