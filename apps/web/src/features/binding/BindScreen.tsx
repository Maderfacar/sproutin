'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { AuthUser } from '@sproutin/shared';
import { AuthError, lineBind } from '../../lib/auth';
import { useBranding } from '../../lib/branding';

interface BindScreenProps {
  // 手機（LIFF）帶 token 進來；電腦（網頁版 OAuth）為 null，token 在伺服器端 cookie 裡。
  idToken: string | null;
  onBound: (user: AuthUser) => void;
}

function bindErrorMessage(error: unknown): string {
  const code = error instanceof AuthError ? error.code : '';
  switch (code) {
    case 'binding_code_invalid':
      // 後端刻意不區分「碼不存在」與「碼已失效」，避免變成可探測有效碼的介面，
      // 因此這裡一併說明可能的原因，讓家長知道下一步該找誰。
      return '這組綁定碼無法使用。可能是輸入有誤、已經被使用過，或已超過有效期限。請向園所確認或索取新的綁定碼。';
    case 'line_already_bound':
      return '這個 LINE 帳號已經綁定過另一個園所帳號了。如需更換，請聯絡園所協助解除綁定。';
    case 'user_already_bound':
      return '這組綁定碼對應的帳號已經完成綁定了。若不是你本人操作，請立即聯絡園所。';
    case 'user_inactive':
      return '這個帳號目前已停用，請聯絡園所。';
    case 'invalid_input':
      return '綁定碼格式不正確，請再確認一次。';
    case 'bind_session_expired':
      // 桌面版：暫存的 LINE 憑證過期（隔太久才輸入碼）→ 重新登入即可，不是碼的問題。
      return '這個頁面停留太久了，請重新用 LINE 登入一次再輸入綁定碼。';
    default:
      return '綁定失敗，請稍後再試。若持續發生請聯絡園所。';
  }
}

// 未綁定的 LINE 帳號進入 App 時看到的第一個畫面。
// 這是很多家長使用系統的第一步，所以：說清楚為什麼要這一步、碼從哪裡來、卡住了找誰。
// 支援從網址帶入（園所發的連結或 QR 掃進來會是 ?code=XXXX-XXXX），會的人掃、不會的人手打。
export function BindScreen({ idToken, onBound }: BindScreenProps) {
  const branding = useBranding();
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('code');
    if (fromUrl) setCode(fromUrl);
  }, []);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!code.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const user = await lineBind(idToken, code.trim());
      onBound(user);
    } catch (err: unknown) {
      setError(bindErrorMessage(err));
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <p className="eyebrow">{branding.brandName}</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">
        歡迎，先完成一次綁定
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        為了確認你的身分，請輸入園所提供的綁定碼。
        綁定只需要做這一次，之後打開就會直接進入。
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <label className="field-label">
          <span>綁定碼</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="例如 ABCD-2345"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            className="field text-center text-lg font-semibold tracking-[0.2em]"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-md2 border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending || !code.trim()} className="btn-primary disabled:opacity-50">
          {pending ? '綁定中…' : '完成綁定'}
        </button>
      </form>

      <div className="mt-8 border-t border-line pt-5">
        <p className="text-xs font-bold text-ink">拿不到綁定碼？</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
          綁定碼由園所發給你本人，通常印在通知單上或由老師轉交。
          若你沒有收到、或碼已經過期，請直接聯絡園所重新索取。
        </p>
      </div>
    </main>
  );
}
