import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemberSession } from '@/lib/auth/guards';
import { sendPortfolioFile } from '@/lib/portfolioReport';

export const dynamic = 'force-dynamic';

/** GET /api/v1/me/portfolio-report/file?download=1 — the signed-in client's own PDF (viewing or download) */
export async function GET(req: NextRequest) {
  const member = await getMemberSession();
  if (!member) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  try {
    // The lookup is by the signed-in client's id, so nobody can reach another client's file
    const client = await prisma.approvedClient.findUnique({
      where: { id: member.cid },
      select: { isActive: true, portfolioReport: { select: { fileKey: true, fileName: true } } },
    });
    if (!client?.isActive) return NextResponse.json({ error: 'Access is not active' }, { status: 403 });
    if (!client.portfolioReport) return NextResponse.json({ error: 'No report available' }, { status: 404 });
    const { fileKey, fileName } = client.portfolioReport;
    return await sendPortfolioFile(fileKey, fileName, req.nextUrl.searchParams.get('download') === '1');
  } catch (error) {
    console.error('[MyPortfolio] File failed:', (error as Error).message);
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
}
