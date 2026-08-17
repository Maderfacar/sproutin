import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// 固定名單（哪個孩子搭哪一班、在哪裡上下車）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/bus/assignments');
}

export function PUT(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/bus/assignments');
}
