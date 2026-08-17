import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageComposer } from './MessageComposer';

// 群發的填寫端。行為重點（全部源自「送出後無法收回」這一件事）：
//   ① 兩段式送出：第一顆按鈕只是準備，攤開則數與「不可收回」後才有真的送出鍵；
//   ② 則數要顯示「收得到／還沒綁定」兩個數字；
//   ③ 0 人時不讓他送；
//   ④ 改動內容會退回第一段（避免看著舊的則數按下確定）。

const create = vi.fn();
const preview = { data: { willReceive: 12, unbound: 3 }, isLoading: false };

vi.mock('./hooks', () => ({
  useCreateCampaign: () => ({
    mutate: create,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: null,
  }),
  useRecipientPreview: () => preview,
  campaignErrorMessage: (_e: unknown, f: string) => f,
}));

vi.mock('../classes/hooks', () => ({
  useMyClasses: () => ({ data: [{ id: 'class-sun', name: '太陽班', studentCount: 10 }] }),
}));

vi.mock('../school/hooks', () => ({
  useUploadImage: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  uploadErrorMessage: () => '',
}));

vi.mock('../../lib/branding', () => ({
  useBranding: () => ({ brandName: '晴光幼兒園' }),
}));

function fillTitle(text = '中秋節親子活動'): void {
  fireEvent.change(screen.getByLabelText(/標題/), { target: { value: text } });
}

beforeEach(() => {
  create.mockReset();
  preview.data = { willReceive: 12, unbound: 3 };
});

describe('MessageComposer', () => {
  it('先顯示人數（收得到 / 還沒綁定兩個數字）', () => {
    render(<MessageComposer />);
    expect(screen.getByText(/12 位收得到/)).toBeTruthy();
    expect(screen.getByText(/3 位還沒綁定/)).toBeTruthy();
  });

  it('沒填標題 → 不能進到送出那一步', () => {
    render(<MessageComposer />);
    expect(screen.getByRole('button', { name: '準備送出' }).hasAttribute('disabled')).toBe(true);
  });

  // 一顆按鈕直接送出太危險；確認對話框則會被習慣性按掉。
  it('兩段式送出：第一段沒有送出鍵，第二段才出現並標明則數與不可收回', () => {
    render(<MessageComposer />);
    fillTitle();
    expect(screen.queryByRole('button', { name: /確定送出/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '準備送出' }));
    expect(screen.getByText(/這次會送出 12 則/)).toBeTruthy();
    expect(screen.getByText(/送出後無法收回/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '確定送出 12 則' })).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('按下確定 → 送出（帶版型、收件範圍與內容）', () => {
    render(<MessageComposer />);
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: '準備送出' }));
    fireEvent.click(screen.getByRole('button', { name: '確定送出 12 則' }));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]![0]).toMatchObject({
      template: 'GENERAL',
      audience: 'ALL_PARENTS',
      classId: null,
      title: '中秋節親子活動',
      button: null,
    });
  });

  // 看著「12 則」按下確定，內容卻已經改過 —— 必須退回第一段重新確認。
  it('進到確認後又改了內容 → 退回第一段', () => {
    render(<MessageComposer />);
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: '準備送出' }));
    fillTitle('改成別的標題');

    expect(screen.queryByRole('button', { name: /確定送出/ })).toBeNull();
    expect(screen.getByRole('button', { name: '準備送出' })).toBeTruthy();
  });

  it('這個範圍沒有人收得到 → 不讓他送，並說明原因', () => {
    preview.data = { willReceive: 0, unbound: 5 };
    render(<MessageComposer />);
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: '準備送出' }));

    expect(screen.getByRole('button', { name: /確定送出 0 則/ }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/沒有人收得到/)).toBeTruthy();
  });

  it('選了指定班級但還沒挑班級 → 不能往下走', () => {
    render(<MessageComposer />);
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: '指定班級' }));

    expect(screen.getByRole('button', { name: '準備送出' }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('班級'), { target: { value: 'class-sun' } });
    expect(screen.getByRole('button', { name: '準備送出' }).hasAttribute('disabled')).toBe(false);
  });

  // 外部連結是 Human Owner 明確要的，但 http:// 會被 LINE 拒絕，也不該把家長帶去不安全的頁面。
  it('外部連結不是 https → 不能送出；改成 https 後才可以', () => {
    render(<MessageComposer />);
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: '連到外部網址' }));
    fireEvent.change(screen.getByLabelText(/網址/), {
      target: { value: 'http://forms.example/signup' },
    });
    expect(screen.getByRole('button', { name: '準備送出' }).hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText(/網址/), {
      target: { value: 'https://forms.example/signup' },
    });
    expect(screen.getByRole('button', { name: '準備送出' }).hasAttribute('disabled')).toBe(false);
  });

  it('外部連結會明講「我們無法確認那個頁面安全或還活著」', () => {
    render(<MessageComposer />);
    fireEvent.click(screen.getByRole('button', { name: '連到外部網址' }));
    expect(screen.getByText(/無法確認那個頁面安全/)).toBeTruthy();
  });

  it('繳費提醒版型：欄位標明是顯示用文字（系統不記帳）', () => {
    render(<MessageComposer />);
    fireEvent.click(screen.getByRole('button', { name: '繳費提醒' }));

    expect(screen.getByLabelText(/金額（顯示用文字）/)).toBeTruthy();
    expect(screen.getByText(/系統不會記帳也不會自動追繳/)).toBeTruthy();
  });

  it('換版型 → 前一個版型填的欄位不留下來', () => {
    render(<MessageComposer />);
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: '活動通知' }));
    fireEvent.change(screen.getByLabelText(/日期時間/), { target: { value: '9/20' } });
    fireEvent.click(screen.getByRole('button', { name: '一般通知' }));
    fireEvent.click(screen.getByRole('button', { name: '活動通知' }));

    expect((screen.getByLabelText(/日期時間/) as HTMLInputElement).value).toBe('');
  });
});
