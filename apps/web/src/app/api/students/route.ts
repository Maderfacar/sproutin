import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /students（GET 可見範圍內學生，支援 ?classId=;POST 新增學生 OWNER/ADMIN）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/students');
}

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/students');
}
