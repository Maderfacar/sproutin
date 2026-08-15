import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../lib/server/proxy';

// same-origin proxy → 後端 PATCH /leaves/:id/cancel（取消請假）。
export const dynamic = 'force-dynamic';

export function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  return proxyToApi(req, `/leaves/${encodeURIComponent(params.id)}/cancel`);
}
