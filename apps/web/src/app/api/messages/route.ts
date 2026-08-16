import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /messages（GET ?studentId= 訊息串 / POST 發訊）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/messages');
}

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/messages');
}
