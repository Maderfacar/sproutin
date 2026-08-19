import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from './Badge';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { ErrorNotice } from './ErrorNotice';
import { Field } from './Field';
import { Progress } from './Progress';
import { Row, Avatar } from './Row';
import { SectionHead } from './SectionHead';
import { Segmented } from './Segmented';
import { StateCard } from './StateCard';
import { Tile } from './Tile';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Button', () => {
  it('主要按鈕滿版（它是這一頁的主角）', () => {
    render(<Button variant="primary">送出</Button>);
    expect(screen.getByRole('button', { name: '送出' }).className).toContain('w-full');
  });

  it('次要按鈕不滿版，除非明講', () => {
    const { rerender } = render(<Button>取消</Button>);
    expect(screen.getByRole('button', { name: '取消' }).className).not.toContain('w-full');
    rerender(<Button block>取消</Button>);
    expect(screen.getByRole('button', { name: '取消' }).className).toContain('w-full');
  });

  // 危險動作用 stop 淡底，不是實心紅 —— 駁回請假該讓人停一下，不是被嚇到。
  it('危險按鈕用 stop 淡底而非實心紅', () => {
    render(<Button variant="danger">駁回</Button>);
    const cls = screen.getByRole('button', { name: '駁回' }).className;
    expect(cls).toContain('bg-stop-wash');
    expect(cls).not.toContain('bg-stop-text');
  });

  it('可點的按鈕高度至少 44px', () => {
    render(<Button variant="primary">送出</Button>);
    expect(screen.getByRole('button', { name: '送出' }).className).toContain('min-h-touch');
  });

  it('預設 type=button，不會誤送出包著它的表單', () => {
    render(<Button>看更多</Button>);
    expect(screen.getByRole('button', { name: '看更多' })).toHaveProperty('type', 'button');
  });
});

describe('Badge', () => {
  it('狀態徽章有邊框、不搶注意力', () => {
    render(<Badge tone="good">到校</Badge>);
    const cls = screen.getByText('到校').className;
    expect(cls).toContain('border');
    expect(cls).toContain('bg-good-wash');
  });

  // 數字徽章在催人動手，必須比周圍任何東西都跳。
  it('數字徽章是實心的', () => {
    render(
      <Badge tone="stop" count>
        3
      </Badge>,
    );
    const cls = screen.getByText('3').className;
    expect(cls).toContain('bg-stop-text');
    expect(cls).toContain('tabular-nums');
  });
});

describe('Tile', () => {
  it('有連結時整塊是連結，數字大於 0 才畫徽章', () => {
    render(<Tile icon="check" title="點名" detail="還有 3 人沒點" count={3} href="/liff/attendance" />);
    expect(screen.getByRole('link', { name: /點名/ })).toHaveProperty(
      'href',
      expect.stringContaining('/liff/attendance'),
    );
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('沒事情要做就不畫數字（0 不是一個要顯示的數字）', () => {
    render(<Tile icon="bus" title="娃娃車" count={0} href="/liff/bus" />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('沒給連結時是按鈕，點得動', () => {
    const onClick = vi.fn();
    render(<Tile icon="doc" title="請假" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /請假/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('StateCard', () => {
  it('答案是整張卡最大的字，整張用狀態色', () => {
    const { container } = render(
      <StateCard eyebrow="王小明 · 今天" headline="已到校" detail="早上 8:12 進教室" tone="good" />,
    );
    expect(container.querySelector('section')?.className).toContain('bg-good-wash');
    expect(screen.getByText('已到校').className).toContain('text-3xl');
  });

  it('沒有細節就不畫空行', () => {
    render(<StateCard headline="尚未點名" tone="neutral" />);
    expect(screen.getByText('尚未點名')).toBeTruthy();
  });
});

describe('Progress', () => {
  it('進度旁邊一定有存檔回饋（重複點名的根因）', () => {
    render(<Progress value={22} max={25} unit="已點名" />);
    expect(screen.getByText('已存檔')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('22');
  });

  it('還在送的時候說儲存中', () => {
    render(<Progress value={1} max={25} unit="已點名" saved={false} />);
    expect(screen.getByText('儲存中…')).toBeTruthy();
  });

  // 一個學生都沒有的班會讓分母變 0；除下去是 NaN，進度條會整條消失。
  it('分母是 0 也不會算出 NaN', () => {
    render(<Progress value={0} max={0} unit="已點名" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuemax')).toBe('0');
  });
});

describe('Segmented', () => {
  it('選項全部攤開看得見，不用點開才知道有什麼', () => {
    render(
      <Segmented
        label="選擇範圍"
        options={[
          { value: 'today', label: '今天' },
          { value: 'week', label: '本週' },
        ]}
        value="today"
        onChange={() => {}}
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: '今天' }).getAttribute('aria-checked')).toBe('true');
  });

  it('點了會回報選到哪一個', () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="選擇範圍"
        options={[
          { value: 'today', label: '今天' },
          { value: 'week', label: '本週' },
        ]}
        value="today"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: '本週' }));
    expect(onChange).toHaveBeenCalledWith('week');
  });
});

describe('Field', () => {
  // 錯誤貼在欄位下面，不是頁面頂端 —— 頂端的紅字在手機上常常已經捲出畫面。
  it('有錯誤時顯示錯誤，並蓋掉平常的提示', () => {
    render(
      <Field label="請假原因" hint="送出後老師會收到" error="請填寫原因">
        <input />
      </Field>,
    );
    expect(screen.getByText('請填寫原因')).toBeTruthy();
    expect(screen.queryByText('送出後老師會收到')).toBeNull();
  });

  it('沒錯誤時顯示提示', () => {
    render(
      <Field label="請假原因" hint="送出後老師會收到">
        <input />
      </Field>,
    );
    expect(screen.getByText('送出後老師會收到')).toBeTruthy();
  });
});

describe('Row 與 Avatar', () => {
  it('頭像取名字第一個字，且對螢幕閱讀器隱藏（旁邊就是全名）', () => {
    const { container } = render(<Avatar name="王小明" />);
    const el = container.querySelector('span');
    expect(el?.textContent).toBe('王');
    expect(el?.getAttribute('aria-hidden')).toBe('true');
  });

  it('清單列高度至少 44px', () => {
    const { container } = render(<Row title="王小明" trailing={<Badge tone="good">到校</Badge>} />);
    expect(container.firstElementChild?.className).toContain('min-h-touch');
  });
});

describe('EmptyState', () => {
  // 「無資料」是系統名詞，會讓人以為壞掉了。
  it('講的是發生了什麼，不是無資料', () => {
    render(<EmptyState title="今天沒有人請假" hint="有人送出就會出現在這裡" />);
    expect(screen.getByText('今天沒有人請假')).toBeTruthy();
    expect(screen.getByText('有人送出就會出現在這裡')).toBeTruthy();
  });
});

describe('ErrorNotice', () => {
  it('是 alert，並且有得重試就給重試', () => {
    const onRetry = vi.fn();
    render(<ErrorNotice message="沒能連上，可能是網路斷了。" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '再試一次' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('沒得重試就不放一顆按了沒用的按鈕', () => {
    render(<ErrorNotice message="你沒有這位學生的權限。" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SectionHead', () => {
  // 用線的粗細分輕重，不用標籤解釋自己（這是 Band 退役的原因）。
  it('要動手的段落用粗線，只是看的用細線', () => {
    const { container, rerender } = render(<SectionHead title="今天還有 3 件事" />);
    expect(container.firstElementChild?.className).toContain('border-b-2');
    rerender(<SectionHead title="這個月的紀錄" weight="review" />);
    expect(container.firstElementChild?.className).not.toContain('border-b-2');
  });

  it('標題講內容，不再有分類籤', () => {
    render(<SectionHead eyebrow="小班 · 李老師" title="今天還有 3 件事" />);
    expect(screen.getByRole('heading', { name: '今天還有 3 件事' })).toBeTruthy();
    expect(screen.queryByText('要做的事')).toBeNull();
  });
});
