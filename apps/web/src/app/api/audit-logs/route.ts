import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 GET /audit-logs（OWNER/ADMIN;篩選 + 分頁;回應為信封 {data,meta}）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/audit-logs');
}
