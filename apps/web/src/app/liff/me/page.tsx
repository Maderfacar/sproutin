'use client';

import { useBranding } from '../../../lib/branding';
import { useSession } from '../../../lib/session';
import { useCapabilities } from '../../../lib/useCapabilities';
import { ROLE_LABEL } from '../../../lib/roleLabels';
import { logout } from '../../../lib/auth';
import { useActivePersona } from '../../../lib/usePersona';
import { PERSONA_HINT, PERSONA_LABEL } from '../../../lib/persona';
import type { IconName } from '../../../components/Icon';
import { FontScaleControl } from '../../../components/FontScaleControl';
import { Badge, Button, Row, SectionHead, Tile } from '../../../components/ui';

// 園所管理入口（僅 OWNER/ADMIN 可見;真正授權在後端 Guard）。
const ADMIN_LINKS: { href: string; title: string; description: string; icon: IconName }[] = [
  {
    href: '/liff/admin/appearance',
    title: '園所外觀',
    description: '名稱、代表色、園徽封面、功能卡片',
    icon: 'image',
  },
  { href: '/liff/admin/classes', title: '班級管理', description: '新增班級、改名、刪除空班', icon: 'home' },
  {
    href: '/liff/admin/students',
    title: '學生管理',
    description: '新增學生、換班、在學狀態',
    icon: 'heart',
  },
  {
    href: '/liff/admin/people',
    title: '人員管理',
    description: '老師與家長帳號、帶班與綁定小孩',
    icon: 'user',
  },
  { href: '/liff/admin/roles', title: '權限設定', description: '一頁看完誰有什麼身分', icon: 'shield' },
  {
    href: '/liff/admin/bus',
    title: '娃娃車設定',
    description: '路線、接送點順序、指派隨車老師',
    icon: 'bus',
  },
  {
    href: '/liff/admin/messages',
    title: '發送訊息',
    description: '做一張卡片送到家長的 LINE（送出後不可收回）',
    icon: 'send',
  },
];

async function handleLogout(): Promise<void> {
  await logout();
  window.location.reload();
}

// 「我的」：我是誰 → 我在哪間園 → 現在用哪個身分 → 顯示設定 →（園所管理）→ 登出。
//
// 這是底部頁籤的第四格，所以不放返回鍵（PageHeader back=false 的同一條理由）。
// 「目前身分」那一段只有多重身分的人看得到 —— 純家長看到「你現在是家長」是廢話。
export default function MePage() {
  const { user } = useSession();
  const branding = useBranding();
  const flags = useCapabilities();
  const { persona, canSwitch } = useActivePersona();
  const roleLabels = [...new Set(user.roles.map((r) => ROLE_LABEL[r.role] ?? r.role))];

  return (
    <div className="flex flex-col gap-7">
      <section className="rise-in flex items-center gap-4">
        <span
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-primary text-2xl font-bold text-brand-contrast"
        >
          {user.displayName.charAt(0)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl font-bold text-ink">{user.displayName}</h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {roleLabels.map((label) => (
              <Badge key={label} tone="neutral">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <Row
        lead={
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-primary bg-brand-wash text-sm font-bold text-brand-primary"
          >
            {branding.brandName.charAt(0)}
          </span>
        }
        title={branding.brandName}
        detail="你目前在這間園所"
      />

      {/* 多重身分的人才需要知道自己現在站在哪一邊。切換在頁首左上角那顆鈕。 */}
      {canSwitch && (
        <section>
          <SectionHead
            title="目前身分"
            description="要換身分請點左上角那顆鈕"
            weight="review"
          />
          <Row
            title={`以${PERSONA_LABEL[persona]}身分`}
            detail={PERSONA_HINT[persona]}
            trailing={<Badge tone="brand">使用中</Badge>}
          />
        </section>
      )}

      {/* 顯示設定（Human Owner 2026-08-18：只放家長手機端、只記在這支瀏覽器上）。 */}
      <FontScaleControl />

      {/* 園所管理只在校方身分下出現。家長身分的人**有沒有權限**是另一回事
          —— 他確實是園長，後端也會放行；但既然這個 App 一次只做一種身分，
          在家長的世界裡放一排後台入口就是把兩個世界又混回去了
          （Human Owner 2026-08-20）。要用就切回園長身分。
          這裡是這條規則的第一個實作，後來收斂成 lib/useCapabilities（見那支的註解）。 */}
      {flags.canManageSchool && (
        <section>
          <SectionHead
            title="園所管理"
            description="設定好就不太需要再動的東西"
            weight="review"
          />
          <div className="flex flex-col gap-2">
            {ADMIN_LINKS.map((item) => (
              <Tile
                key={item.href}
                icon={item.icon}
                title={item.title}
                detail={item.description}
                tone="neutral"
                href={item.href}
              />
            ))}
          </div>
        </section>
      )}

      <Button variant="secondary" block onClick={() => void handleLogout()}>
        登出
      </Button>
    </div>
  );
}
