'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SchoolAdminConfig } from '@sproutin/shared';
import type { AuthUser } from '@sproutin/shared';
import { apiErrorMessage } from '../../lib/api';
import { StatusScreen } from '../../components/StatusScreen';
import { useSchoolConfig, useUpdateSchoolConfig } from './hooks';
import { BrandSection } from './BrandSection';
import { CardsSection } from './CardsSection';
import { SkeletonCards } from '../../components/Skeleton';

// 只送出真正改過的欄位（PATCH 局部更新；後端要求至少一個欄位）。
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

interface AppearanceEditorProps {
  viewerRoles: AuthUser['roles'];
  // 手機版的儲存列固定在畫面底部（底部頁籤上方）；桌面版跟著內容走即可。
  stickyBar?: boolean;
}

// 園所外觀的「品牌 / 家長看到的卡片 / 請假流程」三段。
// 手機版 /liff/admin/appearance 與桌面版 /admin/appearance 共用這一份 —— 同一份功能、兩種外框。
// 改動先存在草稿，按「儲存」才寫回；顏色在編輯過程即時套用到整個 App，讓園長邊改邊看。
export function AppearanceEditor({ viewerRoles, stickyBar = false }: AppearanceEditorProps) {
  const { data: config, isLoading, isError, error } = useSchoolConfig();
  const update = useUpdateSchoolConfig();
  const [draft, setDraft] = useState<SchoolAdminConfig | null>(null);

  // 伺服器資料到齊（或儲存成功後更新）→ 重置草稿。
  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  // 即時預覽：草稿顏色直接套到 CSS 變數；離開頁面時還原成該校已儲存的值。
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

  if (isLoading || !draft) {
    return <SkeletonCards cards={3} />;
  }
  if (isError || !config) {
    return <StatusScreen status="error" message={apiErrorMessage(error)} />;
  }

  const change = (next: Partial<SchoolAdminConfig>): void =>
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));

  const bar = (
    <div className="flex items-center gap-3">
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
  );

  return (
    <div className={`space-y-6 ${stickyBar ? 'pb-24' : ''}`}>
      <BrandSection draft={draft} onChange={change} />
      <CardsSection draft={draft} onChange={change} viewerRoles={viewerRoles.map((r) => r.role)} />

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

      {update.isError && <p className="text-sm text-red-700">{apiErrorMessage(update.error)}</p>}

      {stickyBar ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
          <div
            className="mx-auto max-w-2xl px-5 py-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            {bar}
          </div>
        </div>
      ) : (
        <div className="card p-4">{bar}</div>
      )}
    </div>
  );
}
