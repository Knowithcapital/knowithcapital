import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/guards';
import { sendPortfolioFile } from '@/lib/portfolioReport';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/portfolio-reports/:id/file?download=1 — open or download any client's report (admin only) */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  const report = await prisma.portfolioReport.findUnique({ where: { id }, select: { fileKey: true, fileName: true } }).catch(() => null);
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  return sendPortfolioFile(report.fileKey, report.fileName, req.nextUrl.searchParams.get('download') === '1');
}
