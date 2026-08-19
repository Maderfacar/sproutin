'use client';

import { useMemo } from 'react';
import { useSession } from './session';
import { personaFlags, roleFlags, type RoleFlags } from './roles';
import { useScopedPersona } from './useScopedPersona';

// 「目前這個身分，這一塊要不要畫出來。」**共用元件裡的顯示判斷一律用這個。**
//
// 這是 `useVisibleStudents()` / `useVisibleClasses()` 的姊妹：那兩個收斂「看得到哪些資料」，
// 這一個收斂「看得到哪些入口」。三個加起來才算真的把兩個世界分開。
//
// 為什麼不能直接用 `roleFlags(user.roles)`：它取的是角色聯集。於是老師兼家長切到家長身分，
// 公告頁上還有一顆「發一則公告」；園長兼家長的學生頁上還有娃娃車設定。
// 後端會放行（他確實是老師），但入口出現在家長的世界裡，這個殼就白切了。
//
// **桌面後台（/admin/*）不受身分影響，一律用角色** —— 那條判斷收在 `useScopedPersona`，
// 與資料範圍那兩個 hook 共用同一份（見那支的註解）。
//
// **這不是權限。** 進不進得來某一頁仍然由 `roleFlags` 擋（那一層對應後端 Guard），
// 真正的授權永遠在後端。
export function useCapabilities(): RoleFlags {
  const { user } = useSession();
  const persona = useScopedPersona();

  return useMemo(() => {
    const flags = roleFlags(user.roles);
    return persona === null ? flags : personaFlags(flags, persona);
  }, [user.roles, persona]);
}
