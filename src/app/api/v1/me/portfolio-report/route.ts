import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberSession } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/** GET /api/v1/me/portfolio-report — details of the signed-in client's current report, or null */
export async function GET() {
  const member = await getMemberSession();
  if (!member) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  try {
    // Re-check the client is still approved, so suspending a client cuts access straight away
    const client = await prisma.approvedClient.findUnique({
      where: { id: member.cid },
      select: { isActive: true, portfolioReport: { select: { fileName: true, fileSize: true, reportDate: true, uploadedAt: true } } },
    });
    if (!client?.isActive) return NextResponse.json({ error: 'Access is not active' }, { status: 403 });
    return NextResponse.json({ report: client.portfolioReport }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[MyPortfolio] Load failed:', (error as Error).message);
    // Table not created yet → behave like "no report" rather than an error page
    return NextResponse.json({ report: null });
  }
}
