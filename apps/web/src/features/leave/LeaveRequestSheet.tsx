'use client';

import { useState, type FormEvent } from 'react';
import { useCreateLeave } from './hooks';
import { leaveErrorMessage } from './labels';
import { Button, Field, Segmented, Sheet } from '../../components/ui';
import { schoolToday } from '../../lib/datetime';

// 家長申請請假。**從底部滑上來，不跳頁。**
//
// 舊版是把表單長在頁面中段：家長要先捲過「請假紀錄」才看得到，填完送出之後又不確定
// 自己在哪一段。改成面板之後，動線是「按一顆按鈕 → 填 → 關掉 → 新的一列就在清單最上面」，
// 從頭到尾沒有離開過請假這一頁。

// 'YYYY-MM-DD'（date input）→ 該日 UTC 午夜的 ISO datetime（後端 zod 要求 datetime 格式，
// 且事件投影以 UTC 逐日對齊 seed / Attendance @@unique([studentId,date])）。
function dateToIso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

const CATEGORIES = [
  { value: '病假', label: '病假' },
  { value: '事假', label: '事假' },
  { value: '其他', label: '其他' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

interface LeaveRequestSheetProps {
  open: boolean;
  studentId: string;
  studentName: string;
  onClose: () => void;
}

export function LeaveRequestSheet({ open, studentId, studentName, onClose }: LeaveRequestSheetProps) {
  const [category, setCategory] = useState<Category>('病假');
  const [dateFrom, setDateFrom] = useState(schoolToday);
  const [dateTo, setDateTo] = useState(schoolToday);
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const createLeave = useCreateLeave();

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    setLocalError(null);

    if (!dateFrom || !dateTo) {
      setLocalError('請選擇請假的日期。');
      return;
    }
    if (!reason.trim()) {
      setLocalError('請寫一下原因，老師才知道發生什麼事。');
      return;
    }
    if (dateTo < dateFrom) {
      setLocalError('結束日期比開始日期早了，請再檢查一次。');
      return;
    }

    createLeave.mutate(
      {
        studentId,
        dateFrom: dateToIso(dateFrom),
        dateTo: dateToIso(dateTo),
        reason: `${category}：${reason.trim()}`,
      },
      {
        // 送出成功就直接關掉面板 —— 新的那一列已經樂觀更新到清單最上面（見 hooks），
        // 再留一句「已送出」在面板裡，家長還要自己按一次關閉。
        onSuccess: () => {
          setReason('');
          setDateFrom(schoolToday());
          setDateTo(schoolToday());
          setLocalError(null);
          onClose();
        },
      },
    );
  }

  const errorText = localError ?? (createLeave.isError ? leaveErrorMessage(createLeave.error) : null);

  return (
    <Sheet open={open} title={`幫 ${studentName} 請假`} onClose={onClose}>
      {/* noValidate：驗證全部自己來。瀏覽器原生的 required 泡泡各家長得不一樣、
          文案也不是我們寫的，而且它會擋在 submit 之前 —— 使用者只會看到一個灰泡泡跳出來，
          不會看到我們寫在欄位旁邊那句「發生什麼事」。 */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field label="哪一種假">
          <Segmented
            label="請假類別"
            options={CATEGORIES}
            value={category}
            onChange={(v) => setCategory(v)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="從哪一天">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                // 開始日往後挪過結束日時一起帶過去，不要留下一組反過來的日期讓人自己發現。
                if (e.target.value > dateTo) setDateTo(e.target.value);
              }}
              className="field tabular-nums"
            />
          </Field>
          <Field label="到哪一天">
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="field tabular-nums"
            />
          </Field>
        </div>

        <Field
          label="發生什麼事"
          hint="送出後老師會收到，核准結果會出現在下面的紀錄裡"
          error={errorText ?? undefined}
        >
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (localError) setLocalError(null);
            }}
            rows={3}
            maxLength={500}
            placeholder="例如：發燒需要在家休息"
            className="field resize-none"
          />
        </Field>

        <Button type="submit" variant="primary" disabled={createLeave.isPending}>
          {createLeave.isPending ? '送出中…' : '送出請假'}
        </Button>
      </form>
    </Sheet>
  );
}
