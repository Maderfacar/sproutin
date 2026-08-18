// 訊息中心：一則通知點進去該回到哪一頁。
//
// 這是**路由**問題，所以留在前端 —— 後端只補人看得懂的字（標題/副標），
// 不該知道 `/liff/...` 長什麼樣（見 api 的 notification-summary.ts）。
//
// href 一律寫**手機版網址**，由 components/SurfaceLink 依目前所在外框翻譯
// （docs/04 §3b）。桌面版的老師點同一則通知會被帶到 /admin/... 的對應頁。

function studentIdOf(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>).studentId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * 回 null＝這一則沒有可以去的地方（沒見過的 type）。
 * 呼叫端要把它畫成不可點的一列，而不是畫成連結卻按了沒反應。
 */
export function notificationHref(type: string, payload: unknown): string | null {
  const studentId = studentIdOf(payload);

  switch (type) {
    case 'AnnouncementPublished':
      return '/liff/announcement';

    // 親師對話與聯絡簿是同一頁（Human Owner 決策：訊息併入聯絡簿）。
    // 沒有 studentId 就回不到那個孩子的那一頁，退回列表讓人自己選。
    case 'MessageSent':
    case 'CommunicationBookPublished':
      return studentId ? `/liff/communication-book/${studentId}` : '/liff/communication-book';

    case 'LeaveSubmitted':
    case 'LeaveApproved':
    case 'LeaveRejected':
    case 'LeaveCancelled':
      return '/liff/leave';

    case 'AttendanceMarked':
    case 'attendance.override_conflict':
      return '/liff/attendance';

    default:
      return null;
  }
}

// 收件匣左側的圖示。與 components/Icon 的名稱對齊。
export function notificationIcon(type: string): 'mega' | 'chat' | 'book' | 'doc' | 'cal' | 'bell' {
  switch (type) {
    case 'AnnouncementPublished':
      return 'mega';
    case 'MessageSent':
      return 'chat';
    case 'CommunicationBookPublished':
      return 'book';
    case 'LeaveSubmitted':
    case 'LeaveApproved':
    case 'LeaveRejected':
    case 'LeaveCancelled':
      return 'doc';
    case 'AttendanceMarked':
    case 'attendance.override_conflict':
      return 'cal';
    default:
      return 'bell';
  }
}
