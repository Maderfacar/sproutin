'use client';

import Link from 'next/link';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';
import { adminEntries, type AdminEntry } from '../../../lib/adminEntries';
import { usePeople } from '../../../features/people/hooks';
import { useSchoolPendingLeaves } from '../../../features/leave/hooks';
import { useMyClasses } from '../../../features/classes/hooks';
import { useAdminStudents } from '../../../features/students/adminHooks';
import { Icon, type IconName } from '../../../components/Icon';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${WEEKDAY[d.getDay()]}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return '早安';
  if (h < 18) return '午安';
  return '晚安';
}

function Metric({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="rounded-md2 bg-black/[0.025] p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-0.5 font-serif text-3xl font-semibold text-ink">
        {value === null ? '—' : value}
        {unit && value !== null && <span className="ml-1 text-xs font-normal text-ink-soft">{unit}</span>}
      </p>
    </div>
  );
}

function TodoRow({ href, icon, text }: { href: string; icon: IconName; text: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-line py-2.5 text-sm text-ink-soft transition last:border-0 hover:text-ink"
    >
      <Icon name={icon} className="h-4 w-4 shrink-0 text-brand-primary" />
      <span className="min-w-0 flex-1">{text}</span>
      <Icon name="chev" className="h-4 w-4 shrink-0" />
    </Link>
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
    todos.push({ href: '/liff/leave?from=admin', icon: 'cal', text: `${pending} 筆請假等待審核` });
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

      <section className="card p-5">
        <p className="eyebrow">需要你處理</p>
        {todos.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">今天沒有待辦，一切正常。</p>
        ) : (
          <div className="mt-2">
            {todos.map((t) => (
              <TodoRow key={t.href} {...t} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Entry({ href, icon, label, hint }: AdminEntry) {
  return (
    <Link href={href} className="card flex items-start gap-3 p-4 transition hover:shadow-lift">
      <Icon name={icon} className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{hint}</span>
      </span>
    </Link>
  );
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
        <p className="eyebrow">園務後台</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">
          {user.displayName}，{greeting()}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">{today()}</p>
      </header>

      {flags.canManageSchool && <SchoolOverview />}

      <section>
        <p className="eyebrow">常用</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {adminEntries(flags).map((entry) => (
            <Entry key={entry.href} {...entry} />
          ))}
        </div>
      </section>

      <p className="border-t border-line pt-5 text-xs leading-relaxed text-ink-soft">
        今日到校人數與各班一覽會在之後加上（需要一支專門統計的後端端點）。
        班級、學生、園所外觀等頁面目前是手機版版型，之後會陸續搬到這個桌面版後台。
      </p>
    </div>
  );
}
