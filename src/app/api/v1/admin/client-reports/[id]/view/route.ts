import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/guards';
import { reportResponse } from '@/lib/reportHtml';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/client-reports/:id/view — preview any uploaded report (admin only) */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  const report = await prisma.clientReport.findUnique({ where: { id }, select: { html: true } }).catch(() => null);
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  return reportResponse(report.html);
}
