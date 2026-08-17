'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { ApiError, apiGet, apiSend } from '../../lib/api';
import type {
  CampaignAudience,
  CampaignView,
  CreateCampaignBody,
  RecipientPreview,
} from './types';

// LINE 群發（OWNER/ADMIN）。授權走 httpOnly cookie，實際權限由後端 Guard 判定。

export function useCampaigns(): UseQueryResult<CampaignView[]> {
  return useQuery({
    queryKey: ['pushCampaigns'],
    queryFn: () => apiGet<CampaignView[]>('/api/push-campaigns'),
  });
}

// 送出前算「這次會送出幾則」。收件範圍一改就重算 —— 這個數字是園長按下送出前的最後判斷依據，
// 不能等到送完才知道。
export function useRecipientPreview(
  audience: CampaignAudience,
  classId: string | null,
): UseQueryResult<RecipientPreview> {
  return useQuery({
    queryKey: ['pushCampaignRecipients', audience, classId],
    queryFn: () => {
      const params = new URLSearchParams({ audience });
      if (classId) {
        params.set('classId', classId);
      }
      return apiGet<RecipientPreview>(`/api/push-campaigns/recipients?${params.toString()}`);
    },
    // 選了「指定班級」卻還沒挑班級 → 不發請求（後端會回 400，但那不是錯誤，是還沒填完）。
    enabled: audience !== 'CLASS' || Boolean(classId),
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCampaignBody) =>
      apiSend<CampaignView>('/api/push-campaigns', 'POST', body),
    onSuccess: () => {
      // 前綴涵蓋紀錄清單與人數預估（綁定狀態不會因為送出而變，但清單一定要重取）。
      void queryClient.invalidateQueries({ queryKey: ['pushCampaigns'] });
    },
  });
}

export function campaignErrorMessage(error: unknown, fallback: string): string {
  const code = error instanceof ApiError ? error.code : (error as { code?: string })?.code;
  switch (code) {
    case 'class_id_required':
      return '請選擇要發給哪一個班級。';
    case 'class_not_found':
      return '找不到這個班級，請重新選一次。';
    case 'class_id_not_allowed':
      return '收件範圍不是「指定班級」，請先把班級取消。';
    case 'button_url_must_be_https':
      return '外部連結必須是 https 開頭（LINE 不接受 http，也不該把家長帶去不安全的網站）。';
    case 'button_target_required':
      return '按鈕還沒設定要連到哪裡。';
    case 'button_target_ambiguous':
      return '按鈕只能選「App 裡的頁面」或「外部連結」其中一種。';
    case 'button_label_required':
      return '請填按鈕上要顯示的文字。';
    case 'liff_id_not_configured':
      return '園所還沒設定 LIFF ID，按鈕無法連到 App。請改用外部連結或聯絡系統管理者。';
    case 'out_of_scope':
      return '只有園長或行政人員可以發送群發訊息。';
    default:
      return fallback;
  }
}
