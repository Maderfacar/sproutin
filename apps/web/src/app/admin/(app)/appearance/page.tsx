'use client';

import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';
import { StatusScreen } from '../../../../components/StatusScreen';
import { AppearanceEditor } from '../../../../features/school/AppearanceEditor';
import { RichMenuSection } from '../../../../features/rich-menu/RichMenuSection';

// 園所外觀設計（桌面版）。
//
// 圖文選單與品牌收在同一頁，是因為它們是同一件事：**這間園所在家長眼中長什麼樣子**。
// 順序刻意把圖文選單放第一 —— 家長最先看到的是 LINE 選單，不是 App 內頁。
export default function AdminAppearancePage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以修改園所外觀。" />;
  }

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">園所外觀設計</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          園所在家長眼中長什麼樣子——從 LINE 選單到 App 裡的每一頁。
          品牌與卡片的設定按下「儲存」後會立刻套用到全園所有人的畫面。
        </p>
      </header>

      <RichMenuSection />
      <AppearanceEditor viewerRoles={user.roles} />
    </div>
  );
}
