import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 /school/config（GET 讀園所設定;PATCH 更新。授權 OWNER/ADMIN 由後端 Guard 判定）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/school/config');
}

export function PATCH(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/school/config');
}
