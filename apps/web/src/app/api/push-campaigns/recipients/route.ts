import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 GET /push-campaigns/recipients（送出前算「會送出幾則」）。
// query string 由 proxy 原樣轉發。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/push-campaigns/recipients');
}
