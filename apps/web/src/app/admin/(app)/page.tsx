'use client';

import Link from 'next/link';
import { useSession } from '../../../lib/session';
import { roleFlags } from '../../../lib/roles';
import { usePeople } from '../../../features/people/hooks';
import { Icon, type IconName } from '../../../components/Icon';

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${WEEKDAY[d.getDay()]}`;
}

interface EntryProps {
  href: string;
  icon: IconName;
  label: string;
  hint: string;
}

function Entry({ href, icon, label, hint }: EntryProps) {
  return (
    <Link
      href={href}
      className="card flex items-start gap-3 p-4 transition hover:shadow-lift"
    >
      <Icon name={icon} className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{hint}</span>
      </span>
    </Link>
  );
}

// 尚未綁定的人數。獨立成元件是因為只有園長/行政取得到人員名單，
// 老師登入時不該送出那支 API（會 403），而 hook 不能寫在條件式裡。
function UnboundSummary() {
  const { data: people } = usePeople();
  if (!people) return null;
  const unbound = people.filter((p) => !p.hasLineLinked && p.status === 'ACTIVE').length;
  if (unbound === 0) return null;

  return (
    <section className="card flex items-center gap-4 p-5">
      <span className="font-serif text-4xl font-semibold text-brand-primary">{unbound}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">位人員尚未綁定 LINE</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
          他們的帳號已經建好，但本人還無法登入。發一組綁定碼給他們就能開始使用。
        </span>
      </span>
      <Link href="/admin/people" className="btn-secondary shrink-0 text-xs">
        去處理
      </Link>
    </section>
  );
}

// 後台總覽（骨架版）。這一刀先把「進得來、看得到自己是誰、到得了下一頁」做對；
// 完整的園務數字（今日到校 / 待審請假 / 未送出聯絡簿）是下一刀的管理首頁。
// 這裡刻意先放一個真實數字——尚未綁定人數——因為它直接對應園所導入時最會卡住的地方。
export default function AdminHomePage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">園務後台</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">
          {user.displayName}，早安
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">{today()}</p>
      </header>

      {flags.canManageSchool && <UnboundSummary />}

      <section>
        <p className="eyebrow">你可以做的事</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {flags.canManageSchool && (
            <Entry
              href="/admin/people"
              icon="user"
              label="人員與綁定"
              hint="新增帳號、指派班級、發綁定碼"
            />
          )}
          <Entry
            href="/liff"
            icon="home"
            label="切換到手機版"
            hint="聯絡簿、點名、請假審核目前在手機版操作"
          />
        </div>
      </section>

      <p className="border-t border-line pt-5 text-xs leading-relaxed text-ink-soft">
        接下來會加上：今日到校人數、待審請假、未送出的聯絡簿，以及把班級、學生、園所外觀也搬到這個桌面版後台。
      </p>
    </div>
  );
}
