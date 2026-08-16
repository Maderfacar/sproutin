import type { ReactNode } from 'react';

// 清葉線性圖示集（與設計樣板一致）。stroke=currentColor，尺寸由 className 控制。
export type IconName =
  | 'home'
  | 'book'
  | 'bell'
  | 'user'
  | 'doc'
  | 'cal'
  | 'chat'
  | 'mega'
  | 'shield'
  | 'bus'
  | 'wallet'
  | 'cam'
  | 'check'
  | 'chev'
  | 'send';

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9.6h12V10" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.4C10.4 5 7.9 4.5 4.5 5v13.2C7.9 17.7 10.4 18.2 12 19.6 13.6 18.2 16.1 17.7 19.5 18.2V5C16.1 4.5 13.6 5 12 6.4Z" />
      <path d="M12 6.4v13.2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3.6h6l5 5V19.4A1.6 1.6 0 0 1 16.4 21H7.6A1.6 1.6 0 0 1 6 19.4V5.2A1.6 1.6 0 0 1 7 3.6Z" />
      <path d="M13 3.6V9h5" />
      <path d="M9 13.5h6M9 16.5h4" />
    </>
  ),
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.2v3.4M16 3.2v3.4" />
    </>
  ),
  chat: <path d="M4.5 6.6A2 2 0 0 1 6.5 4.6h11a2 2 0 0 1 2 2v6.8a2 2 0 0 1-2 2H9l-4.5 3.4Z" />,
  mega: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1Z" />
      <path d="M17.5 9.2a4 4 0 0 1 0 5.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-2.5Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="5" width="16" height="12" rx="2.5" />
      <path d="M4 12h16M8 17v2M16 17v2" />
      <circle cx="8.5" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="6.4" width="17" height="12.2" rx="2.6" />
      <path d="M15 12.5h4.5" />
    </>
  ),
  cam: (
    <>
      <path d="M4 8.6h3l1.4-2.1h7.2L18 8.6h2a1.6 1.6 0 0 1 1.6 1.6v7.6A1.6 1.6 0 0 1 20 19.4H4a1.6 1.6 0 0 1-1.6-1.6v-7.6A1.6 1.6 0 0 1 4 8.6Z" />
      <circle cx="12" cy="13.6" r="3.1" />
    </>
  ),
  check: <path d="M5 12.6l4.4 4.4L19 7.4" />,
  chev: <path d="M9 6l6 6-6 6" />,
  send: (
    <>
      <path d="M4.5 11.5 20 4.5l-7 15-2.3-6.2-6.2-1.8Z" />
      <path d="M10.7 13.3 20 4.5" />
    </>
  ),
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
