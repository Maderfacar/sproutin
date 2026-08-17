import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../lib/server/proxy';

// same-origin proxy → 後端 POST /rich-menus/:audience/apply（真的送到 LINE）。
export const dynamic = 'force-dynamic';

export function POST(
  req: Request,
  { params }: { params: { audience: string } },
): Promise<NextResponse> {
  return proxyToApi(req, `/rich-menus/${encodeURIComponent(params.audience)}/apply`);
}
