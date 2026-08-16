'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// 外觀預覽（僅此瀏覽器，sessionStorage 保存,不動園所資料）。
// 讓 Human Owner 當場對比不同 theme/layout;null = 依該校 SchoolConfig 預設。
interface Preview {
  theme: string | null;
  layout: string | null;
  setTheme: (t: string | null) => void;
  setLayout: (l: string | null) => void;
}

const PreviewContext = createContext<Preview | null>(null);

export function usePreview(): Preview {
  return (
    useContext(PreviewContext) ?? {
      theme: null,
      layout: null,
      setTheme: () => {},
      setLayout: () => {},
    }
  );
}

function readStore(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string | null): void {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    /* sessionStorage 不可用時忽略 */
  }
}

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<string | null>(null);
  const [layout, setLayoutState] = useState<string | null>(null);

  useEffect(() => {
    setThemeState(readStore('pv_theme'));
    setLayoutState(readStore('pv_layout'));
  }, []);

  const setTheme = (t: string | null): void => {
    setThemeState(t);
    writeStore('pv_theme', t);
  };
  const setLayout = (l: string | null): void => {
    setLayoutState(l);
    writeStore('pv_layout', l);
  };

  return (
    <PreviewContext.Provider value={{ theme, layout, setTheme, setLayout }}>
      {children}
    </PreviewContext.Provider>
  );
}
