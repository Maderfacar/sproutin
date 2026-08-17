import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 /bus/routes（娃娃車路線；GET 隨車老師只會拿到自己那條車）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/bus/routes');
}

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/bus/routes');
}
