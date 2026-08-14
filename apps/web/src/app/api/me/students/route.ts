import { NextResponse } from 'next/server';

// same-origin proxy → 後端 /me/students（轉發 Authorization;API_INTERNAL_URL server-only）。
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  if (!apiInternalUrl) {
    return NextResponse.json({ error: 'api_unconfigured' }, { status: 503 });
  }

  const authorization = req.headers.get('authorization') ?? '';
  const res = await fetch(`${apiInternalUrl}/me/students`, {
    headers: { Authorization: authorization },
    cache: 'no-store',
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
