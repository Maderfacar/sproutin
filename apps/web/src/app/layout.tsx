import type { ReactNode } from 'react';

export const metadata = {
  title: 'Sproutin',
  description: '幼兒園校務管理與家長溝通 SaaS',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
