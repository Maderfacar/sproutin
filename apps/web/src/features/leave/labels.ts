import type { LeaveStatus } from '../../lib/types';
import { ApiError } from '../../lib/api';
import type { Tone } from '../../components/ui';

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, { label: string; className: string }> = {
  PENDING: { label: '待審核', className: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: '已核准', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: '已駁回', className: 'bg-red-100 text-red-800' },
  CANCELLED: { label: '已取消', className: 'bg-gray-100 text-gray-600' },
};

// 可取消的狀態（對齊後端狀態機：僅 PENDING / APPROVED 可取消）。
export const CANCELLABLE_STATUSES: readonly LeaveStatus[] = ['PENDING', 'APPROVED'];

// 把後端錯誤碼轉成家長看得懂的訊息。
export function leaveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'LEAVE_INVALID_TRANSITION':
        return '此請假狀態已無法變更（可能已被處理）。';
      case 'out_of_scope':
        return '你沒有這位學生的權限。';
      case 'invalid_input':
        return '輸入內容有誤，請檢查後再送出。';
      default:
        return `操作失敗（${error.code}）。`;
    }
  }
  return '操作失敗，請稍後再試。';
}

// 清葉加厚的狀態色（components/ui/tone）。舊的 className 仍給尚未改版的頁面用，
// 第三、四批全部改完後移除。
export const LEAVE_STATUS_TONE: Record<LeaveStatus, Tone> = {
  PENDING: 'wait',
  APPROVED: 'good',
  REJECTED: 'stop',
  CANCELLED: 'neutral',
};
