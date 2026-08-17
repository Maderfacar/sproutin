'use client';

import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';
import { PageHeader } from '../../../../components/PageHeader';
import { StatusScreen } from '../../../../components/StatusScreen';
import { BusSettingsPanel } from '../../../../features/bus/BusSettingsPanel';

// 手機版娃娃車設定。與桌面版 /admin/bus 共用 BusSettingsPanel ——
// **功能不因裝置而不同，差別只有外框**（原則見 docs/04）。
export default function BusAdminPage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以設定娃娃車。" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="娃娃車設定" />
      <p className="rise-in text-sm leading-relaxed text-ink-soft">
        娃娃車開到每個孩子的家門口，所以這裡排的是「接送點」——一戶人家一個點。
      </p>
      <BusSettingsPanel />
    </div>
  );
}
