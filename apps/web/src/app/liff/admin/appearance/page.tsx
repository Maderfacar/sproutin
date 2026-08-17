'use client';

import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';
import { PageHeader } from '../../../../components/PageHeader';
import { StatusScreen } from '../../../../components/StatusScreen';
import { AppearanceEditor } from '../../../../features/school/AppearanceEditor';

// 手機版園所外觀。內容與桌面版 /admin/appearance 共用 AppearanceEditor，
// 差別只有外框、標題與儲存列的位置（手機固定在底部）。
// 圖文選單設計只在桌面版 —— 那是需要大畫面反覆比對的工作。
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
        這裡的設定會立刻套用到全園所有人的畫面。改完記得按下方的「儲存」。
      </p>
      <AppearanceEditor viewerRoles={user.roles} stickyBar />
    </div>
  );
}
