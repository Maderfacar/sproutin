import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /users（GET 人員清單，支援 ?role=;POST 新增帳號。皆 OWNER/ADMIN）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/users');
}

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/users');
}
