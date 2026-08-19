'use client';

import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';
import { adminEntries, type AdminEntry } from '../../../lib/adminEntries';
import { usePeople } from '../../../features/people/hooks';
import { useSchoolPendingLeaves } from '../../../features/leave/hooks';
import { useMyClasses } from '../../../features/classes/hooks';
import { useAdminStudents } from '../../../features/students/adminHooks';
import type { IconName } from '../../../components/Icon';
import { EmptyState, SectionHead, Tile } from '../../../components/ui';
import { schoolHour } from '../../../lib/datetime';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${WEEKDAY[d.getDay()]}`;
}

function greeting(): string {
  const h = schoolHour();
  if (h < 11) return '早安';
  if (h < 18) return '午安';
  return '晚安';
}

function Metric({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="rounded-card bg-surface-sunk p-4">
      <p className="text-2xs font-semibold text-ink-soft">{label}</p>
      <p className="mt-0.5 font-serif text-3xl font-bold tabular-nums text-ink">
        {value === null ? '—' : value}
        {unit && value !== null && (
          <span className="ml-1 text-2xs font-normal text-ink-soft">{unit}</span>
        )}
      </p>
    </div>
  );
}

// 全校概況。獨立成元件是因為這些 API 只開放園長/行政，老師呼叫會 403，
// 而 hook 不能寫在條件式裡 —— 由上層決定要不要掛載這個元件。
function SchoolOverview() {
  const { data: people } = usePeople();
  const { data: pendingLeaves } = useSchoolPendingLeaves(true);
  const { data: classes } = useMyClasses();
  const { data: students } = useAdminStudents();

  const unbound =
    people?.filter((p) => !p.hasLineLinked && p.status === 'ACTIVE').length ?? null;
  const pending = pendingLeaves?.length ?? null;

  const todos: { href: string; icon: IconName; text: string }[] = [];
  if (pending) {
    todos.push({ href: '/admin/leave', icon: 'cal', text: `${pending} 筆請假等待審核` });
  }
  if (unbound) {
    todos.push({
      href: '/admin/people',
      icon: 'user',
      text: `${unbound} 位人員尚未綁定 LINE，本人還無法登入`,
    });
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="待審請假" value={pending} />
        <Metric label="尚未綁定" value={unbound} unit="人" />
        <Metric label="班級" value={classes?.length ?? null} unit="班" />
        <Metric label="在學學生" value={students?.length ?? null} unit="人" />
      </section>

      <section>
        <SectionHead title="需要你處理" weight={todos.length > 0 ? 'action' : 'review'} />
        {todos.length === 0 ? (
          <EmptyState title="今天沒有待辦" hint="請假都審完了，人員也都綁定好了" />
        ) : (
          <div className="flex flex-col gap-2">
            {todos.map((t) => (
              <Tile key={t.href} icon={t.icon} title={t.text} tone="note" href={t.href} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Entry({ href, icon, label, hint }: AdminEntry) {
  return <Tile icon={icon} title={label} detail={hint} tone="neutral" href={href} />;
}

// 管理首頁（階段3 ②）。
// 這一頁回答的是「今天有沒有事要我處理」，所以順序是：數字 → 待辦 → 常用入口。
//
// **刻意先不放「今日到校」與各班一覽**（Human Owner 決策 C, 2026-08-17）：
// 出缺勤與聯絡簿的查詢端點都必須指定班級，全校統計需要逐班發請求或新增後端端點，
// 兩者都不划算 —— 先把拿得到的數字做好，那兩塊等真的需要時再一併處理。
export default function AdminHomePage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-2xs font-semibold text-ink-mute">園務後台</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">
          {user.displayName}，{greeting()}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">{today()}</p>
      </header>

      {flags.canManageSchool && <SchoolOverview />}

      <section>
        <SectionHead title="常用" description="左側每一條在手機上都有對應的頁面" weight="review" />
        <div className="grid gap-2 sm:grid-cols-2">
          {adminEntries(flags).map((entry) => (
            <Entry key={entry.href} {...entry} />
          ))}
        </div>
      </section>

      <p className="border-t border-line pt-5 text-2xs leading-relaxed text-ink-soft">
        「全園今天到幾個、哪一班還沒點完」在手機版的園長首頁（`features/home/AdminHome`）——
        同一套系統、同一份資料，差別只有操作介面。
      </p>
    </div>
  );
}
