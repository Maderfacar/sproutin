import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../lib/server/proxy';

// same-origin proxy → 後端 PATCH /messages/:id/read（標記已讀）。
export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/messages/${encodeURIComponent(params.id)}/read`);
}
