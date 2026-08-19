import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Band } from './Band';

// Band 改版後只剩一層薄殼（section + SectionHead）。
// 這份測試釘的是**拿掉了什麼**：分類籤與身分籤。
// 介面需要貼標籤解釋自己，就是版面已經失敗了（Human Owner 2026-08-20）。
describe('Band（斷句的薄殼）', () => {
  it('畫出標題與說明', () => {
    render(
      <Band kind="review" title="陳小宇 的聯絡簿" description="老師送出後這裡就會更新">
        內容
      </Band>,
    );
    expect(screen.getByRole('heading', { name: '陳小宇 的聯絡簿' })).toBeTruthy();
    expect(screen.getByText('老師送出後這裡就會更新')).toBeTruthy();
  });

  // 「要做的事／查看／管理」那組分類籤已退役。
  it('不再畫分類籤', () => {
    render(
      <Band kind="review" title="陳小宇 的聯絡簿">
        內容
      </Band>,
    );
    expect(screen.queryByText('查看')).toBeNull();
    expect(screen.queryByText('要做的事')).toBeNull();
  });

  it('沒給說明就不畫空白的一行', () => {
    const { container } = render(
      <Band kind="action" title="今天要填的聯絡簿">
        內容
      </Band>,
    );
    expect(container.querySelectorAll('p').length).toBe(0);
  });

  // 這是 Band 唯一真正有效、因此被保留下來的東西：份量差別就是斷句。
  it('「要做的事」用粗線收住，「查看」用細線', () => {
    const { container: a } = render(
      <Band kind="action" title="做">
        x
      </Band>,
    );
    const { container: b } = render(
      <Band kind="review" title="看">
        x
      </Band>,
    );
    expect(a.querySelector('.border-b-2')).not.toBeNull();
    expect(b.querySelector('.border-b-2')).toBeNull();
  });

  // 身分改由整個殼區分（components/shell），一次只給一種身分 —— 標籤沒有存在的必要。
  it('就算傳了 audience 也不再貼身分籤', () => {
    render(
      <Band kind="action" title="今天要填的聯絡簿" audience="staff">
        內容
      </Band>,
    );
    expect(screen.queryByText(/以.*身分/)).toBeNull();
  });

  it('內容照樣渲染出來', () => {
    render(
      <Band kind="review" title="標題">
        <p>裡面的東西</p>
      </Band>,
    );
    expect(screen.getByText('裡面的東西')).toBeTruthy();
  });
});
