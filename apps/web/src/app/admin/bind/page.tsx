'use client';

import { useRouter } from 'next/navigation';
import { BindScreen } from '../../../features/binding/BindScreen';

// 桌面版綁定畫面：LINE 登入成功、但這個 LINE 還沒接上任何園所帳號時會來到這裡。
// 後台新建的行政人員第一次在電腦上登入走的就是這條路 —— 少了它，人會卡在登入頁出不去。
// 與手機版共用同一個 BindScreen 與同一個兌換端點；差別只在 LINE 憑證存放位置
// （手機在前端記憶體，電腦在伺服器端的 httpOnly cookie，故此處傳 null）。
export default function AdminBindPage() {
  const router = useRouter();
  return <BindScreen idToken={null} onBound={() => router.replace('/admin')} />;
}
