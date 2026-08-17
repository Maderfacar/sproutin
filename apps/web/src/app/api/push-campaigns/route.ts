import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /push-campaigns（LINE 群發：GET 送出紀錄 / POST 排入一次群發）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/push-campaigns');
}

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/push-campaigns');
}
