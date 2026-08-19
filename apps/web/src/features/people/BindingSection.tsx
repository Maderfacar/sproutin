'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { apiErrorMessage } from '../../lib/api';
import type { UserView } from '../../lib/types';
import { Button, ErrorNotice, SectionHead, Sheet } from '../../components/ui';
import {
  peopleErrorMessage,
  useBindingCodes,
  useIssueBindingCode,
  useRevokeBindingCode,
  useUnbindLine,
} from './hooks';

function expiryLabel(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return days <= 0 ? '已過期' : `${days} 天後到期`;
}

// clipboard API 在非 https 或舊瀏覽器可能不存在；失敗時回 false 讓 UI 誠實顯示「請手動複製」。
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// 單一人員的 LINE 綁定狀態與操作（人員編輯區內）。
// 三種狀態各自對應一個明確的下一步，園所不必猜：
//   已綁定 → 只能解除（換手機 / 綁錯人的救援出口）
//   未綁定且有有效碼 → 顯示碼讓園所抄下或轉交，可作廢重發
//   未綁定且沒有碼 → 產生一組
//
// 解除綁定的確認收進底部面板（不在原地展開）——「確定解除」長在剛按過的位置上最容易誤按，
// 而誤按的後果是本人立刻登不進來。
export function BindingSection({ person }: { person: UserView }) {
  const { data: codes } = useBindingCodes();
  const issue = useIssueBindingCode();
  const revoke = useRevokeBindingCode();
  const unbind = useUnbindLine();
  const [confirmUnbind, setConfirmUnbind] = useState(false);
  const [copied, setCopied] = useState<'code' | 'failed' | null>(null);

  const active = codes?.find((c) => c.userId === person.id);
  const error = issue.error ?? revoke.error ?? unbind.error;
  const pending = issue.isPending || revoke.isPending || unbind.isPending;

  return (
    <section>
      <SectionHead title="LINE 綁定" weight="review" />

      {person.hasLineLinked ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 rounded-md2 border border-good-edge bg-good-wash px-4 py-3 text-sm font-semibold text-good-text">
            <Icon name="check" className="h-4 w-4 shrink-0" />
            已完成綁定，本人可以正常登入
          </p>
          <Button variant="danger" block={false} onClick={() => setConfirmUnbind(true)}>
            解除綁定
          </Button>
        </div>
      ) : active ? (
        <div className="flex flex-col gap-3">
          <p className="text-2xs leading-relaxed text-ink-soft">
            把這組碼交給本人，他在 LINE 裡打開系統時輸入一次即可。
          </p>
          <div className="rounded-tile border border-line-strong bg-surface-sunk px-4 py-4 text-center">
            <p className="select-all font-serif text-3xl font-bold tracking-[0.18em] text-ink">
              {active.code}
            </p>
            <p className="mt-1 text-2xs text-ink-soft">{expiryLabel(active.expiresAt)}</p>
          </div>

          {/* 只提供「複製碼」：家長是從園所 OA 的選單進來的，本來就已經在頁面上，
              缺的只有這組碼（Human Owner 2026-08-17）。帶碼連結屬於另一種發送方式，
              在主要流程裡是多餘的選項，拿掉以免讓園所猶豫該按哪一顆。 */}
          <Button
            variant="primary"
            onClick={() => void copyText(active.code).then((ok) => setCopied(ok ? 'code' : 'failed'))}
          >
            複製綁定碼
          </Button>
          {copied === 'code' && (
            <p className="text-center text-2xs font-semibold text-good-text">已複製</p>
          )}
          {copied === 'failed' && (
            <p className="text-center text-2xs text-ink-soft">
              這台裝置無法自動複製，請長按上面的碼手動複製。
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              block={false}
              disabled={pending}
              onClick={() => issue.mutate({ userId: person.id })}
            >
              重新產生
            </Button>
            <Button
              variant="secondary"
              block={false}
              disabled={pending}
              onClick={() => revoke.mutate({ id: active.id })}
            >
              作廢
            </Button>
          </div>
          <p className="text-2xs leading-relaxed text-ink-soft">
            重新產生會讓上面這組立刻失效 —— 條子不見了就重發，舊碼不會留著被別人撿去用。
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
            <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
            尚未綁定，本人還無法登入。產生一組綁定碼交給他，輸入後就能開始使用。
          </p>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => issue.mutate({ userId: person.id })}
          >
            {issue.isPending ? '產生中…' : '產生綁定碼'}
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <ErrorNotice message={peopleErrorMessage(error, apiErrorMessage(error))} />
        </div>
      )}

      <Sheet
        open={confirmUnbind}
        title={`解除 ${person.displayName} 的 LINE 綁定？`}
        onClose={() => setConfirmUnbind(false)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-ink">
            解除後這個人立刻無法登入，要重新發一組綁定碼給他才進得來。
            換手機或綁錯人的時候才需要這個動作。
          </p>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              unbind.mutate({ userId: person.id }, { onSuccess: () => setConfirmUnbind(false) })
            }
          >
            {unbind.isPending ? '解除中…' : '確定解除綁定'}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
