import type { AttendanceStatus } from '../../lib/types';

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENT: { label: '出席', className: 'bg-green-100 text-green-800' },
  ABSENT: { label: '缺席', className: 'bg-red-100 text-red-800' },
  LEAVE: { label: '請假', className: 'bg-amber-100 text-amber-800' },
  LATE: { label: '遲到', className: 'bg-orange-100 text-orange-800' },
};
