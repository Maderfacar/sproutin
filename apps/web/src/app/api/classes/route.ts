import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 GET /classes（我的班級 + 班名;staff）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/classes');
}
