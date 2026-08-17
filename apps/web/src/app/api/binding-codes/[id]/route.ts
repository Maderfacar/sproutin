import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 /binding-codes/:id（作廢；保留紀錄供稽核）。
export const dynamic = 'force-dynamic';

export function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/binding-codes/${encodeURIComponent(params.id)}`);
}
