'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useSession } from './session';
import { availablePersonas, resolvePersona, type Persona } from './persona';

const STORAGE_KEY = 'sproutin.persona';

// 目前記住的身分。**放在模組層而不是各自的 useState** —— 這是實際踩過的坑：
// 頁首的切換器和外框的頁籤各自呼叫一次 hook，各自 useState 就變成兩份狀態，
// 於是在切換器裡選了「家長」，底下的頁籤還停在老師。
// 身分是「整個 App 現在是什麼樣子」，本來就只能有一份。
let remembered: string | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): string | null {
  return remembered;
}

// 伺服器端沒有 localStorage。這裡固定回 null，讓首屏與 hydrate 後的第一次 render
// 結果一致 —— 對不上的話 React 會整棵重畫，使用者會看到畫面閃一下。
function getServerSnapshot(): string | null {
  return null;
}

function publish(next: string | null): void {
  remembered = next;
  for (const listener of listeners) {
    listener();
  }
}

interface ActivePersona {
  persona: Persona;
  /** 這個人可以切到哪些身分。只有一種時不該畫切換器。 */
  available: Persona[];
  setPersona: (next: Persona) => void;
  /** 有得切才是多重身分。純家長或純老師看到切換器只是噪音。 */
  canSwitch: boolean;
}

// 目前以什麼身分在用這個 App。
//
// 記在 localStorage 而不是網址或後端：切身分是「我現在想做哪類事」，跨頁跨次都該記得；
// 放網址會讓每一條分享出去的連結都帶著身分，放後端則是一個純前端偏好卻要多一次往返。
//
// 記住的值每次都要對照現有角色重新驗一遍（resolvePersona）——
// 角色被拔掉後還停在舊身分，會變成一個點什麼都 403 的殼。
export function useActivePersona(): ActivePersona {
  const { user } = useSession();
  const available = useMemo(() => availablePersonas(user.roles), [user.roles]);
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // 掛載後才讀 localStorage（理由同 getServerSnapshot）。只有第一次需要讀，
  // 之後的變化都經過 publish。
  useEffect(() => {
    if (remembered !== null) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) publish(saved);
    } catch {
      // 無痕模式或關掉儲存權限：記不住而已，不影響使用。
    }
  }, []);

  const persona = resolvePersona(available, stored);

  const setPersona = useCallback((next: Persona) => {
    publish(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 同上：記不住不是錯誤。
    }
  }, []);

  return { persona, available, setPersona, canSwitch: available.length > 1 };
}

// 測試用：清掉模組層記住的身分。模組狀態會跨測試殘留，
// 上一個測試選過「家長」會讓下一個測試從家長殼開始。
export function resetPersonaForTests(): void {
  publish(null);
}
