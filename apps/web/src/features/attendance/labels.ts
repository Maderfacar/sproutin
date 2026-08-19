import type { AttendanceStatus } from '../../lib/types';
import type { Tone } from '../../components/ui';

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENT: { label: '出席', className: 'border border-good-edge bg-good-wash text-good-text' },
  ABSENT: { label: '缺席', className: 'border border-stop-edge bg-stop-wash text-stop-text' },
  LEAVE: { label: '請假', className: 'border border-wait-edge bg-wait-wash text-wait-text' },
  LATE: { label: '遲到', className: 'border border-note-edge bg-note-wash text-note-text' },
};

// 清葉加厚的狀態色（components/ui/tone）。舊的 className 仍給尚未改版的頁面用，
// 第三、四批全部改完後移除。
export const ATTENDANCE_STATUS_TONE: Record<AttendanceStatus, Tone> = {
  PRESENT: 'good',
  ABSENT: 'stop',
  LEAVE: 'wait',
  LATE: 'note',
};
