import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth/guards';
import { isStoredFileUrl, readFile, safeFileName } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/insights/:id/pdf — the original PDF of a published insight ("Download PDF").
 * Served through the website, so it works whichever storage backend holds the file (some, like
 * Cloudinary, block direct public links to PDFs by default). Drafts are only for admins (?preview=1).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const insight = await prisma.insight.findUnique({ where: { id }, select: { title: true, contentUrl: true, isActive: true } });
    const preview = req.nextUrl.searchParams.get('preview') === '1' && Boolean(await getAdminSession());
    if (!insight || !insight.contentUrl || (!insight.isActive && !preview) || !isStoredFileUrl(insight.contentUrl)) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }
    const bytes = await readFile(insight.contentUrl);
    const name = safeFileName(insight.title || 'insight').replace(/\.pdf$/i, '') || 'insight';
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${name}.pdf"`,
        'Cache-Control': insight.isActive ? 'public, max-age=300' : 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[InsightPdf] Failed:', (error as Error).message);
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }
}
