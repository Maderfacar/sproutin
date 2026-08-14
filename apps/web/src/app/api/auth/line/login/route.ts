import { NextResponse } from 'next/server';

// same-origin proxy → 後端 /auth/line/login（保 API_INTERNAL_URL 為 server-only，ADR-001）。
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  if (!apiInternalUrl) {
    return NextResponse.json({ error: 'api_unconfigured' }, { status: 503 });
  }

  const body = await req.text();
  const res = await fetch(`${apiInternalUrl}/auth/line/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
