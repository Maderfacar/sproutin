'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SchoolAdminConfig } from '@sproutin/shared';
import { useSession } from '../../../../lib/session';
import { roleFlags } from '../../../../lib/roles';
import { apiErrorMessage } from '../../../../lib/api';
import { PageHeader } from '../../../../components/PageHeader';
import { StatusScreen } from '../../../../components/StatusScreen';
import { useSchoolConfig, useUpdateSchoolConfig } from '../../../../features/school/hooks';
import { BrandSection } from '../../../../features/school/BrandSection';
import { CardsSection } from '../../../../features/school/CardsSection';

// 只送出真正改過的欄位（PATCH 局部更新;後端要求至少一個欄位）。
function diff(base: SchoolAdminConfig, draft: SchoolAdminConfig): Partial<SchoolAdminConfig> {
  const patch: Partial<SchoolAdminConfig> = {};
  const keys = [
    'brandName',
    'logoUrl',
    'bannerUrl',
    'primaryColor',
    'secondaryColor',
    'featureFlags',
    'cardOrder',
    'leaveRequiresApproval',
  ] as const;
  for (const key of keys) {
    if (JSON.stringify(base[key]) !== JSON.stringify(draft[key])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (patch as any)[key] = draft[key];
    }
  }
  return patch;
}

// 園所外觀設定（OWNER/ADMIN）。改動先存在草稿，按「儲存」才寫回園所資料;
// 顏色在編輯過程即時套用到整個 App，讓園長邊改邊看。
export default function AppearancePage() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { data: config, isLoading, isError, error } = useSchoolConfig();
  const update = useUpdateSchoolConfig();
  const [draft, setDraft] = useState<SchoolAdminConfig | null>(null);

  // 伺服器資料到齊（或儲存成功後更新）→ 重置草稿。
  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  // 即時預覽：草稿顏色直接套到 CSS 變數;離開頁面時還原成該校已儲存的值。
  useEffect(() => {
    if (!draft) return;
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', draft.primaryColor);
    root.style.setProperty('--brand-secondary', draft.secondaryColor);
    return () => {
      if (!config) return;
      root.style.setProperty('--brand-primary', config.primaryColor);
      root.style.setProperty('--brand-secondary', config.secondaryColor);
    };
  }, [draft, config]);

  const patch = useMemo(() => (config && draft ? diff(config, draft) : {}), [config, draft]);
  const dirty = Object.keys(patch).length > 0;

  if (!flags.canManageSchool) {
    return <StatusScreen status="error" message="只有園長或行政人員可以修改園所外觀。" />;
  }
  if (isLoading || !draft) {
    return <StatusScreen status="loading" message="載入園所設定中…" />;
  }
  if (isError || !config) {
    return <StatusScreen status="error" message={apiErrorMessage(error)} />;
  }

  const change = (next: Partial<SchoolAdminConfig>): void =>
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="園所外觀" />
      <p className="rise-in text-sm leading-relaxed text-ink-soft">
        這裡的設定會立刻套用到全園所有人的畫面。改完記得按下方的「儲存」。
      </p>

      <BrandSection draft={draft} onChange={change} />
      <CardsSection draft={draft} onChange={change} />

      <section className="rise-in card p-5" style={{ animationDelay: '0.1s' }}>
        <p className="section-title">請假流程</p>
        <label className="mt-3 flex items-start gap-3">
          <input
            type="checkbox"
            checked={draft.leaveRequiresApproval}
            onChange={(e) => change({ leaveRequiresApproval: e.target.checked })}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-primary"
          />
          <span>
            <span className="text-sm font-semibold text-ink">請假需要老師或行政審核</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
              關閉後，家長送出的請假會直接生效，不需要有人按核准。
            </span>
          </span>
        </label>
      </section>

      {update.isError && (
        <p className="text-sm text-red-700">{apiErrorMessage(update.error)}</p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
        <div
          className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <span className="text-xs text-ink-soft">
            {dirty ? '尚未儲存的變更' : update.isSuccess ? '已儲存' : '目前沒有變更'}
          </span>
          <button
            type="button"
            onClick={() => setDraft(config)}
            disabled={!dirty || update.isPending}
            className="btn-secondary ml-auto text-sm"
          >
            復原
          </button>
          <button
            type="button"
            onClick={() => update.mutate(patch)}
            disabled={!dirty || update.isPending}
            className="btn-primary text-sm"
          >
            {update.isPending ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}
