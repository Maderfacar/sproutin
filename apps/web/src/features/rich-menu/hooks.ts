'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { ApiError, apiGet, apiSend } from '../../lib/api';
import type {
  ApplyResult,
  RichMenuAudience,
  RichMenuConfigView,
  SaveRichMenuBody,
} from './types';

// 園所 LINE 圖文選單（OWNER/ADMIN）。授權走 httpOnly cookie，實際權限由後端 Guard 判定。

export function useRichMenus(): UseQueryResult<RichMenuConfigView[]> {
  return useQuery({
    queryKey: ['richMenus'],
    queryFn: () => apiGet<RichMenuConfigView[]>('/api/rich-menus'),
  });
}

export function useSaveRichMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ audience, body }: { audience: RichMenuAudience; body: SaveRichMenuBody }) =>
      apiSend<RichMenuConfigView>(`/api/rich-menus/${audience}`, 'PUT', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['richMenus'] });
    },
  });
}

// 真的送到 LINE。與儲存分開是因為 LINE 的「建立選單」有每小時 100 次上限，
// 而園長調版面時會存很多次。
export function useApplyRichMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ audience }: { audience: RichMenuAudience }) =>
      apiSend<ApplyResult>(`/api/rich-menus/${audience}/apply`, 'POST'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['richMenus'] });
    },
  });
}

export function richMenuErrorMessage(error: unknown, fallback: string): string {
  const code = error instanceof ApiError ? error.code : (error as { code?: string })?.code;
  switch (code) {
    case 'line_messaging_not_configured':
      return '系統還沒設定 LINE 的權杖，無法套用到 LINE。請聯絡系統管理者。';
    case 'rich_menu_not_saved':
      return '請先儲存這份選單的設計，再套用到 LINE。';
    case 'rich_menu_image_required':
      return '還沒有底圖。LINE 不接受沒有底圖的選單，請先上傳一張。';
    case 'rich_menu_image_too_large':
      return 'LINE 規定底圖不能超過 1MB，請壓縮後重新上傳。';
    case 'rich_menu_image_format':
      return 'LINE 的底圖只接受 PNG 或 JPG。';
    case 'rich_menu_image_unreachable':
      return '讀不到底圖，請重新上傳一次。';
    case 'rich_menu_image_unreadable':
      return '這張圖讀不出尺寸，可能檔案損毀。請換一張 PNG 或 JPG。';
    case 'rich_menu_image_width':
      return '底圖的寬度必須在 800 到 2500 像素之間（這是 LINE 的規定）。';
    case 'rich_menu_image_height':
      return '底圖的高度至少要 250 像素（這是 LINE 的規定）。';
    case 'rich_menu_image_ratio':
      return '底圖太方了。LINE 規定寬度至少要是高度的 1.45 倍，例如 2500 × 1686。';
    case 'rich_menu_no_items':
      return '至少要設定一格，否則選單點下去什麼都不會發生。';
    case 'rich_menu_item_duplicated':
      return '同一格被設定了兩次，請檢查一下。';
    case 'rich_menu_item_out_of_range':
      return '有格子超出這個版面的範圍，換版面後請重新確認每一格。';
    case 'rich_menu_chat_bar_text_length':
      return `聊天列上的文字不能空白，也不能超過 ${14} 個字（這是 LINE 的限制）。`;
    case 'liff_id_not_configured':
      return '園所還沒設定 LIFF ID，選單無法連到 App。請聯絡系統管理者。';
    default:
      // LINE 自己回的錯誤原樣帶出來 —— 內容是英文，但至少說得出是哪裡不對，
      // 比一句「操作失敗」有用得多（也方便回報給我們查）。
      if (typeof code === 'string' && code.startsWith('line_rejected:')) {
        return `LINE 不接受這份選單：${code.slice('line_rejected:'.length).trim()}`;
      }
      return fallback;
  }
}
