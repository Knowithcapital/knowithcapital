import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberSession } from '@/lib/auth/guards';
import { reportResponse } from '@/lib/reportHtml';

export const dynamic = 'force-dynamic';

/** GET /api/v1/me/reports/:id/view — the report page, only for the client it belongs to */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const member = await getMemberSession();
  if (!member) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const client = await prisma.approvedClient.findUnique({ where: { id: member.cid }, select: { isActive: true } });
    if (!client?.isActive) return NextResponse.json({ error: 'Access is not active' }, { status: 403 });

    // The clientId in the filter is what stops one client opening another client's report
    const report = await prisma.clientReport.findFirst({
      where: { id, clientId: member.cid, isPublished: true },
      select: { html: true },
    });
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    return reportResponse(report.html);
  } catch (error) {
    console.error('[MyReports] View failed:', (error as Error).message);
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
}
