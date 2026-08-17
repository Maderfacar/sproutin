import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../lib/server/proxy';

// same-origin proxy → 後端 POST /users/:id/roles（增加身分）。
export const dynamic = 'force-dynamic';

export function POST(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/users/${encodeURIComponent(params.id)}/roles`);
}
