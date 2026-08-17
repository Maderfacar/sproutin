import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /binding-codes（OWNER/ADMIN：列出有效的碼、簽發新碼）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/binding-codes');
}

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/binding-codes');
}
