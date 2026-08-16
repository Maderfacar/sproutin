import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 /teacher-assignments/:id（DELETE 解除編制）。
export const dynamic = 'force-dynamic';

export function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/teacher-assignments/${encodeURIComponent(params.id)}`);
}
