import { NextResponse } from 'next/server';

// same-origin proxy → 後端 /me（轉發 Authorization header；API_INTERNAL_URL 為 server-only）。
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  if (!apiInternalUrl) {
    return NextResponse.json({ error: 'api_unconfigured' }, { status: 503 });
  }

  const authorization = req.headers.get('authorization') ?? '';
  const res = await fetch(`${apiInternalUrl}/me`, {
    headers: { Authorization: authorization },
    cache: 'no-store',
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
