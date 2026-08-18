import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('找不到頁面', () => {
  it('分頁標題講得出這是哪一頁', () => {
    render(<NotFound />);
    expect(document.title).toBe('找不到頁面 · Sproutin');
  });

  it('仍然給得出下一步', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: '回到首頁' }).getAttribute('href')).toBe('/');
  });
});
