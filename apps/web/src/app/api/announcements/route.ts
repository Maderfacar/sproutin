import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /announcements（GET 本人可見:全校 + 相關班級;POST 發布 staff）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/announcements');
}

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/announcements');
}
