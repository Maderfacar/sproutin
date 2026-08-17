'use client';

import { Icon } from '../../components/Icon';
import {
  TARGET_ICON,
  TARGET_LABEL,
  TEMPLATE_SHAPE,
  cellCount,
  type RichMenuItem,
  type RichMenuTemplate,
} from './types';

interface MenuPreviewProps {
  template: RichMenuTemplate;
  imageUrl: string | null;
  chatBarText: string;
  items: RichMenuItem[];
  brandName: string;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

// 手機上的樣子。格線疊在底圖上，讓園長看得出「圖上的按鈕」和「實際可點的區域」有沒有對齊
// —— 底圖是園所自己畫的，對不齊是這類設計器最常見的失誤。
export function MenuPreview({
  template,
  imageUrl,
  chatBarText,
  items,
  brandName,
  selectedIndex,
  onSelect,
}: MenuPreviewProps) {
  const shape = TEMPLATE_SHAPE[template];
  const total = cellCount(template);
  const byIndex = new Map(items.map((i) => [i.index, i.target]));

  return (
    <div className="mx-auto w-[248px] overflow-hidden rounded-[22px] border border-line bg-bg shadow-soft">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5">
        <Icon name="chev" className="h-3.5 w-3.5 rotate-180 text-ink-soft" />
        <span className="truncate text-xs font-semibold text-ink">{brandName}</span>
      </div>

      <div className="min-h-[86px] p-3">
        <p className="rounded-md2 border border-line bg-surface px-2.5 py-2 text-[11px] leading-relaxed text-ink-soft">
          歡迎加入{brandName}！點下方選單就能看到孩子今天的狀況。
        </p>
      </div>

      <div className="border-t border-line bg-surface px-3 py-1.5 text-center text-[11px] text-ink-soft">
        {chatBarText || '　'}
      </div>

      <div
        className="relative grid border-t border-line bg-brand-primary/5 bg-cover bg-center"
        style={{
          gridTemplateColumns: `repeat(${shape.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${shape.rows}, 1fr)`,
          aspectRatio: template === 'TWO' ? '2500 / 843' : '2500 / 1686',
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        }}
      >
        {Array.from({ length: total }, (_, index) => {
          const target = byIndex.get(index);
          const active = selectedIndex === index;
          return (
            <button
              key={index}
              type="button"
              aria-label={`第 ${index + 1} 格`}
              aria-pressed={active}
              onClick={() => onSelect(index)}
              className={`flex flex-col items-center justify-center gap-1 border border-white/40 transition ${
                active ? 'bg-brand-primary/25' : 'hover:bg-white/20'
              }`}
            >
              {target ? (
                <>
                  <Icon name={TARGET_ICON[target]} className="h-4 w-4 text-brand-primary" />
                  {!imageUrl && (
                    <span className="text-[9px] font-semibold text-ink">
                      {TARGET_LABEL[target]}
                    </span>
                  )}
                </>
              ) : (
                !imageUrl && <span className="text-[9px] text-ink-soft">未使用</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
