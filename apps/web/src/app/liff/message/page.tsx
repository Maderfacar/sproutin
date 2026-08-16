'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StatusScreen } from '../../../components/StatusScreen';

// 訊息已併入聯絡簿（Human Owner 決策 2026-08-17：入口收斂成「一個孩子的頁面」）。
// 此網址保留並導向聯絡簿 —— 舊書籤與舊通知連結不該變成 404。
export default function MessageRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/liff/communication-book');
  }, [router]);

  return <StatusScreen status="loading" message="訊息已併入聯絡簿，正在前往…" />;
}
