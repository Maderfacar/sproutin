import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../lib/server/proxy';

export const dynamic = 'force-dynamic';

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/bus/rides/undo');
}
