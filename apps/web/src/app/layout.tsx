import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { FONT_SCALE_BOOT_SCRIPT } from '../lib/fontScale';

export const metadata = {
  title: 'Sproutin',
  description: '幼兒園校務管理與家長溝通 SaaS',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        {/* 字體大小要在首次繪製之前套上，否則會先閃一下標準字再跳大。
            放在 body 的第一個子節點同步執行（見 lib/fontScale）。 */}
        <script dangerouslySetInnerHTML={{ __html: FONT_SCALE_BOOT_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
