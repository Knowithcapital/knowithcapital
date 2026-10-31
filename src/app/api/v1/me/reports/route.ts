import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberSession } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/** GET /api/v1/me/reports — the signed-in client's own published portfolio reports (newest first) */
export async function GET() {
  const member = await getMemberSession();
  if (!member) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  try {
    // Re-check the client is still approved, so suspending a client cuts access straight away
    const client = await prisma.approvedClient.findUnique({ where: { id: member.cid }, select: { isActive: true } });
    if (!client?.isActive) return NextResponse.json({ error: 'Access is not active' }, { status: 403 });

    const reports = await prisma.clientReport.findMany({
      where: { clientId: member.cid, isPublished: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, period: true, createdAt: true },
    });
    return NextResponse.json({ reports }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[MyReports] List failed:', (error as Error).message);
    // Table not created yet → behave like "no reports" rather than an error page
    return NextResponse.json({ reports: [] });
  }
}
