'use client';

import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';
import { StatusScreen } from '../../../../components/StatusScreen';
import { BusSettingsPanel } from '../../../../features/bus/BusSettingsPanel';

// 娃娃車設定（桌面版）。內容與手機版 /liff/admin/bus 共用 BusSettingsPanel ——
// **功能不因裝置而不同，差別只有外框**（原則見 docs/04）。
export default function AdminBusPage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以設定娃娃車。" />;
  }

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">娃娃車設定</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          娃娃車開到每個孩子的家門口，所以這裡排的是「接送點」——一戶人家一個點，
          兄弟姊妹共用同一個。排好順序，隨車老師在車上就照這個順序點名。
        </p>
      </header>

      <BusSettingsPanel />
    </div>
  );
}
