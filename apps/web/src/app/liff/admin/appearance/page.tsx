'use client';

import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';
import { PageHeader } from '../../../../components/PageHeader';
import { StatusScreen } from '../../../../components/StatusScreen';
import { AppearanceEditor } from '../../../../features/school/AppearanceEditor';

// 手機版園所外觀。內容與桌面版 /admin/appearance 共用 AppearanceEditor，差別只有外框與標題。
// 圖文選單設計原本只有桌面版有（違反 §3b 功能對等）；改版後它也收進 AppearanceEditor 的面板裡，
// 兩邊一起有 —— 停課、颱風這種最需要臨時改選單的時刻，園長往往不在電腦前。
export default function AppearancePage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以修改園所外觀。" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="園所外觀" />
      <p className="rise-in text-sm leading-relaxed text-ink-soft">
        這裡的設定按下「儲存」後會立刻套用到全園所有人的畫面。
      </p>
      <AppearanceEditor viewerRoles={user.roles} />
    </div>
  );
}
