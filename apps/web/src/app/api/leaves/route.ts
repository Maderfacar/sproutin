import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /leaves（GET 列表[?studentId=] / POST 申請）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/leaves');
}

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/leaves');
}
