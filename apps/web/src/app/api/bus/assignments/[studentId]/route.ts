import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../lib/server/proxy';

export const dynamic = 'force-dynamic';

export function DELETE(req: Request, { params }: { params: { studentId: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/bus/assignments/${encodeURIComponent(params.studentId)}`);
}
