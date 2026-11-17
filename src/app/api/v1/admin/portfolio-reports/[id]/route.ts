import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/guards';
import { deletePrivate } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** DELETE — removes the client's report and its file from storage */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  const report = await prisma.portfolioReport.findUnique({ where: { id }, select: { fileKey: true } });
  if (!report) return NextResponse.json({ success: true });
  await prisma.portfolioReport.delete({ where: { id } });
  await deletePrivate(report.fileKey);
  return NextResponse.json({ success: true });
}
