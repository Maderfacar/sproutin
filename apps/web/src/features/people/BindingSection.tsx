'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { apiErrorMessage } from '../../lib/api';
import type { UserView } from '../../lib/types';
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
    <div className="border-t border-line pt-4">
      <p className="eyebrow">LINE 綁定</p>

      {person.hasLineLinked ? (
        <>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-ink">
            <Icon name="check" className="h-4 w-4 shrink-0 text-brand-primary" />
            已完成綁定，本人可以正常登入
          </p>
          {confirmUnbind ? (
            <div className="mt-3 rounded-md2 border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm leading-relaxed text-amber-900">
                解除後這個人就無法登入，需要重新發一組綁定碼給他。確定要解除嗎？
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    unbind.mutate({ userId: person.id }, { onSuccess: () => setConfirmUnbind(false) })
                  }
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  確定解除
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUnbind(false)}
                  className="btn-secondary text-xs"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmUnbind(true)}
              className="btn-secondary mt-2 text-xs"
            >
              解除綁定
            </button>
          )}
        </>
      ) : active ? (
        <>
          <p className="mt-1.5 text-xs text-ink-soft">
            把這組碼交給本人，他在 LINE 裡打開系統時輸入一次即可。
          </p>
          <p className="mt-2 select-all text-center font-serif text-2xl font-semibold tracking-[0.18em] text-ink">
            {active.code}
          </p>
          <p className="mt-1 text-center text-xs text-ink-soft">{expiryLabel(active.expiresAt)}</p>

          {/* 只提供「複製碼」：家長是從園所 OA 的選單進來的，本來就已經在頁面上，
              缺的只有這組碼（Human Owner 2026-08-17）。帶碼連結屬於另一種發送方式，
              在主要流程裡是多餘的選項，拿掉以免讓園所猶豫該按哪一顆。 */}
          <button
            type="button"
            onClick={() => void copyText(active.code).then((ok) => setCopied(ok ? 'code' : 'failed'))}
            className="btn-secondary mt-3 w-full text-xs"
          >
            複製綁定碼
          </button>
          {copied === 'code' && <p className="mt-1.5 text-center text-xs text-brand-primary">已複製</p>}
          {copied === 'failed' && (
            <p className="mt-1.5 text-center text-xs text-ink-soft">
              這台裝置無法自動複製，請長按上面的碼手動複製。
            </p>
          )}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => issue.mutate({ userId: person.id })}
              className="btn-secondary text-xs disabled:opacity-50"
            >
              重新產生
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => revoke.mutate({ id: active.id })}
              className="btn-secondary text-xs disabled:opacity-50"
            >
              作廢
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            重新產生會讓上面這組立刻失效 —— 條子不見了就重發，舊碼不會留著被別人撿去用。
          </p>
        </>
      ) : (
        <>
          <p className="mt-1.5 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
            <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
            尚未綁定，本人還無法登入。產生一組綁定碼交給他，輸入後就能開始使用。
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => issue.mutate({ userId: person.id })}
            className="btn-primary mt-3 text-xs disabled:opacity-50"
          >
            {issue.isPending ? '產生中…' : '產生綁定碼'}
          </button>
        </>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-700">{peopleErrorMessage(error, apiErrorMessage(error))}</p>
      )}
    </div>
  );
}
