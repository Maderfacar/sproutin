import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../lib/server/proxy';

export const dynamic = 'force-dynamic';

interface Params {
  params: { id: string };
}

export function PATCH(req: Request, { params }: Params): Promise<NextResponse> {
  return proxyToApi(req, `/bus/points/${encodeURIComponent(params.id)}`);
}

export function DELETE(req: Request, { params }: Params): Promise<NextResponse> {
  return proxyToApi(req, `/bus/points/${encodeURIComponent(params.id)}`);
}
