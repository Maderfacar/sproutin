'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from './session';
import { personaFlags, roleFlags, type RoleFlags } from './roles';
import { useActivePersona } from './usePersona';
import { surfaceOf } from './surface';

// 「目前這個身分，這一塊要不要畫出來。」**共用元件裡的顯示判斷一律用這個。**
//
// 這是 `useVisibleStudents()` / `useVisibleClasses()` 的姊妹：那兩個收斂「看得到哪些資料」，
// 這一個收斂「看得到哪些入口」。三個加起來才算真的把兩個世界分開。
//
// 為什麼不能直接用 `roleFlags(user.roles)`：它取的是角色聯集。於是老師兼家長切到家長身分，
// 公告頁上還有一顆「發一則公告」；園長兼家長的學生頁上還有娃娃車設定。
// 後端會放行（他確實是老師），但入口出現在家長的世界裡，這個殼就白切了。
//
// **桌面後台（/admin/*）不受身分影響，一律用角色。** 身分是手機殼的概念，桌面版沒有那層外框；
// 而且身分記在 localStorage 是跨外框共用的 —— 園長昨天在手機上切到家長身分，
// 今天打開電腦後台就會整片空白。這裡用 `surfaceOf(pathname)` 判斷，
// 不由呼叫端傳 prop（與 SplitColumns 同一條理由：兩個十行的 page.tsx 各要記得傳一次，遲早漏一個）。
//
// **這不是權限。** 進不進得來某一頁仍然由 `roleFlags` 擋（那一層對應後端 Guard），
// 真正的授權永遠在後端。
export function useCapabilities(): RoleFlags {
  const { user } = useSession();
  const { persona } = useActivePersona();
  // usePathname() 在某些 Next 的情境下會是 null（例如還沒進到路由樹的元件）。
  // 那時當作手機外框 —— 桌面後台一定有路徑，不會走到這裡。
  const pathname = usePathname() ?? '';
  const onAdminSurface = surfaceOf(pathname) === 'admin';

  return useMemo(() => {
    const flags = roleFlags(user.roles);
    return onAdminSurface ? flags : personaFlags(flags, persona);
  }, [user.roles, persona, onAdminSurface]);
}
