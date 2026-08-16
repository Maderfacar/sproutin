import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 /guardianships/:id（DELETE 解除綁定）。
export const dynamic = 'force-dynamic';

export function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/guardianships/${encodeURIComponent(params.id)}`);
}
