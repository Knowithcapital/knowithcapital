import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/** PATCH — { isPublished?, title?, period? } */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json();

  const data: { isPublished?: boolean; title?: string; period?: string | null } = {};
  if (typeof body.isPublished === 'boolean') data.isPublished = body.isPublished;
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 200);
  if (typeof body.period === 'string') data.period = body.period.trim().slice(0, 60) || null;

  try {
    await prisma.clientReport.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
}

/** DELETE — removes the report */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  await prisma.clientReport.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
