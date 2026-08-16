'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { FEVER_THRESHOLD_C } from '@sproutin/shared';
import { apiGet, apiSend } from '../../lib/api';
import type {
  BookCheckInBody,
  BookEntryView,
  PublishBookBody,
  SaveBookEntryBody,
} from '../../lib/types';

// 查詢 key 一律以 ['book', ...] 開頭 —— 失效時用**前綴**一次涵蓋班級視圖與個別學生視圖，
// 避免只失效其中一邊而讓使用者看到過期資料（Phase 7 教訓）。
const BOOK_KEY = 'book';

// 整班某日（老師直欄模式）。
export function useClassBook(
  classId: string | undefined,
  dateIso: string,
): UseQueryResult<BookEntryView[]> {
  return useQuery({
    queryKey: [BOOK_KEY, 'class', classId, dateIso],
    queryFn: () =>
      apiGet<BookEntryView[]>(
        `/api/communication-book?classId=${encodeURIComponent(classId!)}&date=${encodeURIComponent(dateIso)}`,
      ),
    enabled: Boolean(classId),
  });
}

// 某學生的聯絡簿區間（家長可回溯全部歷史；後端已依身分過濾未送出的紀錄）。
export function useStudentBook(
  studentId: string | undefined,
  range: { from: string; to: string },
): UseQueryResult<BookEntryView[]> {
  return useQuery({
    queryKey: [BOOK_KEY, 'student', studentId, range.from, range.to],
    queryFn: () =>
      apiGet<BookEntryView[]>(
        `/api/communication-book?studentId=${encodeURIComponent(studentId!)}` +
          `&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      ),
    enabled: Boolean(studentId),
  });
}

// 老師端的三個寫入動作。成功後以前綴失效整組聯絡簿查詢；
// check-in 另外連動出缺勤（同一動作寫兩邊，前端也要同步重取）。
export function useBookMutations() {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: [BOOK_KEY] });
    void queryClient.invalidateQueries({ queryKey: ['attendance'] });
  };

  const save = useMutation({
    mutationFn: (body: SaveBookEntryBody) => apiSend<BookEntryView>('/api/communication-book', 'PUT', body),
    onSuccess: invalidate,
  });

  const checkIn = useMutation({
    mutationFn: (body: BookCheckInBody) =>
      apiSend<BookEntryView>('/api/communication-book/check-in', 'POST', body),
    onSuccess: invalidate,
  });

  const publish = useMutation({
    mutationFn: (body: PublishBookBody) =>
      apiSend<{ published: number; pushed: number }>('/api/communication-book/publish', 'POST', body),
    onSuccess: invalidate,
  });

  return { save, checkIn, publish };
}

// 聯絡簿專屬錯誤訊息（後端以 400 擋下超窗與未來日期）。
export function bookErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'book_edit_window_expired':
      return '這一天已超過可填寫的期限（7 天），無法再修改。';
    case 'book_future_date':
      return '還不能填寫未來的日期。';
    default:
      return fallback;
  }
}

// 「健康需注意」的單一判準：體溫偏高或有勾選任一症狀。
// 老師送出時據此挑出建議即時通知的學生，不必自己判斷算不算緊急。
export function needsHealthAttention(entry: Pick<BookEntryView, 'symptoms' | 'temperature'>): boolean {
  if (entry.symptoms.length > 0) return true;
  return entry.temperature !== null && entry.temperature >= FEVER_THRESHOLD_C;
}

// 是否已有任何記錄（用來區分「還沒填」與「填了但都選正常」）。
export function hasContent(entry: BookEntryView | undefined): boolean {
  if (!entry) return false;
  return Boolean(
    entry.arrivalTime ||
      entry.lunch ||
      entry.snack ||
      entry.nap ||
      entry.toilet ||
      entry.mood ||
      entry.pickup ||
      entry.teacherNote ||
      entry.temperature !== null ||
      entry.symptoms.length > 0,
  );
}
