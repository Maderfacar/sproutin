// 通知 type → 家長看得懂的中文。未知 type 回退顯示原字串（不擋畫面）。
const NOTIFICATION_LABEL: Record<string, string> = {
  LeaveSubmitted: '收到請假申請',
  LeaveApproved: '請假已核准',
  LeaveRejected: '請假已駁回',
  LeaveCancelled: '請假已取消',
  MessageSent: '收到新訊息',
  AnnouncementPublished: '有新公告',
  AttendanceMarked: '出缺勤已更新',
  'attendance.override_conflict': '出缺勤與請假衝突，請確認',
};

export function notificationLabel(type: string): string {
  return NOTIFICATION_LABEL[type] ?? type;
}
