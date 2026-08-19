'use client';

import { useEffect, useMemo, useState } from 'react';
import { MVP_CARDS, type AuthUser, type SchoolAdminConfig } from '@sproutin/shared';
import { apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import {
  Button,
  ErrorNotice,
  SectionHead,
  Sheet,
  SkeletonCards,
  Tile,
} from '../../components/ui';
import { RichMenuSection } from '../rich-menu/RichMenuSection';
import { useSchoolConfig, useUpdateSchoolConfig } from './hooks';
import { BrandSection } from './BrandSection';
import { CardsSection, isCardVisible } from './CardsSection';

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

type OpenSheet = 'brand' | 'cards' | 'menu' | null;

interface AppearanceEditorProps {
  viewerRoles: AuthUser['roles'];
}

// 園所外觀。**頁面主體是「家長現在看到的樣子」，不是一疊欄位。**
//
// 舊版把三段表單（品牌 / 卡片 / 請假流程）全部攤在頁面上，於是進來改一張封面圖
// 要先捲過園名、色票、五個開關。改成清單頁版型之後：最上面一張預覽回答
// 「現在長什麼樣」，下面三塊入口各自把編輯器收進底部面板。
//
// LINE 圖文選單也搬進來了（原本只有桌面版有，違反 §3b 功能對等）——
// 停課、颱風這種最需要改選單的時刻，園長往往不在電腦前。
//
// 改動先存在草稿，按「儲存」才寫回；顏色在編輯過程即時套用到整個 App，讓園長邊改邊看。
// 手機 /liff/admin/appearance 與桌面 /admin/appearance 共用這一份（docs/04 §3b）。
export function AppearanceEditor({ viewerRoles }: AppearanceEditorProps) {
  const { data: config, isLoading, isError, error, refetch } = useSchoolConfig();
  const update = useUpdateSchoolConfig();
  const [draft, setDraft] = useState<SchoolAdminConfig | null>(null);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

  // 伺服器資料到齊（或儲存成功後更新）→ 重置草稿。
  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  // 即時預覽：草稿顏色直接套到 CSS 變數；離開頁面時還原成該校已儲存的值。
  // 寫的是 --brand-base（原始色）而不是 --brand-primary，與 BrandingProvider 一致 ——
  // 深色模式從 base 調出在深底上看得見的那一階，直接寫 primary 會把那一層蓋掉。
  useEffect(() => {
    if (!draft) return;
    const root = document.documentElement;
    root.style.setProperty('--brand-base', draft.primaryColor);
    root.style.setProperty('--brand-secondary', draft.secondaryColor);
    return () => {
      if (!config) return;
      root.style.setProperty('--brand-base', config.primaryColor);
      root.style.setProperty('--brand-secondary', config.secondaryColor);
    };
  }, [draft, config]);

  const patch = useMemo(() => (config && draft ? diff(config, draft) : {}), [config, draft]);
  const dirty = Object.keys(patch).length > 0;

  if (isLoading || !draft) {
    return <SkeletonCards cards={3} />;
  }
  if (isError || !config) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  const change = (next: Partial<SchoolAdminConfig>): void =>
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));

  const save = (onDone?: () => void): void => {
    update.mutate(patch, { onSuccess: () => onDone?.() });
  };

  const visibleCards = MVP_CARDS.filter((c) => isCardVisible(c, draft.featureFlags)).length;

  // 面板裡的存檔列。每一個面板都自己存得起來 —— 改完還要關掉面板再找一顆按鈕，
  // 中間那一步就是「我到底存了沒」的來源。
  const sheetSave = (
    <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
      {update.isError && <ErrorNotice message={apiErrorMessage(update.error)} />}
      <Button
        variant="primary"
        disabled={!dirty || update.isPending}
        onClick={() => save(() => setOpenSheet(null))}
      >
        {update.isPending ? '儲存中…' : '儲存'}
      </Button>
      {!dirty && <p className="text-center text-2xs text-ink-mute">目前沒有改動任何東西</p>}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 這一頁在講的東西：家長打開 App 的第一眼。放在最上面，改完立刻看得到差別。 */}
      <section className="overflow-hidden rounded-tile border border-line-strong bg-surface shadow-soft">
        {draft.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.bannerUrl} alt="" className="h-28 w-full object-cover" />
        ) : (
          <div className="flex h-28 w-full items-center justify-center bg-brand-wash text-2xs text-ink-mute">
            還沒有封面圖
          </div>
        )}
        <div className="flex items-center gap-3 px-4 pb-4">
          <span className="-mt-7 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface shadow-soft">
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name="image" className="h-6 w-6 text-ink-mute" />
            )}
          </span>
          <div className="min-w-0 flex-1 pt-3">
            <p className="truncate font-serif text-xl font-bold tracking-tight text-ink">
              {draft.brandName}
            </p>
            <p className="text-2xs text-ink-mute">家長打開 App 的第一眼</p>
          </div>
          <span aria-hidden className="flex shrink-0 gap-1 pt-3">
            <span
              className="h-6 w-6 rounded-full border border-hairline"
              style={{ background: draft.primaryColor }}
            />
            <span
              className="h-6 w-6 rounded-full border border-hairline"
              style={{ background: draft.secondaryColor }}
            />
          </span>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <Tile
          icon="image"
          title="園所識別"
          detail={`${draft.brandName} · 名稱、顏色、logo、封面`}
          tone="brand"
          onClick={() => setOpenSheet('brand')}
        />
        <Tile
          icon="home"
          title="功能卡片"
          detail={`家長首頁目前顯示 ${visibleCards} 項功能`}
          tone="neutral"
          onClick={() => setOpenSheet('cards')}
        />
        <Tile
          icon="chat"
          title="LINE 圖文選單"
          detail="家長在 LINE 裡最先看到的那排格子"
          tone="neutral"
          onClick={() => setOpenSheet('menu')}
        />
      </div>

      <section>
        <SectionHead
          title="請假流程"
          description="決定家長送出的請假要不要有人按核准"
          weight="review"
        />
        <button
          type="button"
          role="switch"
          aria-checked={draft.leaveRequiresApproval}
          aria-label="請假需要老師或行政審核"
          onClick={() => change({ leaveRequiresApproval: !draft.leaveRequiresApproval })}
          className="tappable flex min-h-touch w-full items-center gap-3 rounded-tile border border-line-strong bg-surface p-4 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold text-ink">請假需要老師或行政審核</span>
            <span className="mt-0.5 block text-2xs leading-relaxed text-ink-soft">
              關掉之後，家長送出的請假直接生效，不需要有人按核准。
            </span>
          </span>
          <span
            aria-hidden
            className={`relative block h-6 w-11 shrink-0 rounded-full border transition ${
              draft.leaveRequiresApproval
                ? 'border-transparent bg-brand-primary'
                : 'border-line bg-surface-sunk'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full shadow-soft transition-all ${
                draft.leaveRequiresApproval ? 'left-6 bg-white' : 'left-0.5 bg-ink-mute'
              }`}
            />
          </span>
        </button>
      </section>

      {/* 頁面上的存檔列只在真的有變更時出現。沒有變更卻常駐一顆灰按鈕，
          等於每次進來都要先確認「我是不是有東西沒存」。 */}
      {dirty && (
        <div className="flex flex-col gap-2 border-t border-line pt-5">
          {update.isError && <ErrorNotice message={apiErrorMessage(update.error)} />}
          <Button variant="primary" disabled={update.isPending} onClick={() => save()}>
            {update.isPending ? '儲存中…' : '儲存這些變更'}
          </Button>
          <Button variant="text" disabled={update.isPending} onClick={() => setDraft(config)}>
            復原，改回儲存前的樣子
          </Button>
        </div>
      )}
      {!dirty && update.isSuccess && (
        <p className="text-2xs font-semibold text-good-text">已儲存，全園的畫面已經跟著換了。</p>
      )}

      <Sheet open={openSheet === 'brand'} title="園所識別" onClose={() => setOpenSheet(null)}>
        <BrandSection draft={draft} onChange={change} />
        {sheetSave}
      </Sheet>

      <Sheet open={openSheet === 'cards'} title="功能卡片" onClose={() => setOpenSheet(null)}>
        <p className="mb-4 text-2xs leading-relaxed text-ink-soft">
          決定家長首頁出現哪些功能、順序如何。標示「規劃中」的開啟後會顯示為即將推出。
        </p>
        <CardsSection
          draft={draft}
          onChange={change}
          viewerRoles={viewerRoles.map((r) => r.role)}
        />
        {sheetSave}
      </Sheet>

      {/* 圖文選單有自己的儲存與套用（它寫的是另一份資料，而且「套用到 LINE」有次數上限），
          所以這個面板不掛上面那條共用存檔列。 */}
      <Sheet open={openSheet === 'menu'} title="LINE 圖文選單" onClose={() => setOpenSheet(null)}>
        <RichMenuSection />
      </Sheet>
    </div>
  );
}
