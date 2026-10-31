import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/guards';
import { MAX_REPORT_BYTES } from '@/lib/reportHtml';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/client-reports?q= — every uploaded report, newest first (without the HTML) */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  try {
    const reports = await prisma.clientReport.findMany({
      where: q
        ? { client: { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } }
        : {},
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true, title: true, period: true, isPublished: true, createdAt: true,
        client: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ reports });
  } catch (error) {
    console.error('[AdminReports] List failed:', error);
    return NextResponse.json({ error: 'Report table is not ready. Run `npx prisma db push` (or redeploy) to create it.' }, { status: 500 });
  }
}

/**
 * POST /api/v1/admin/client-reports
 *   { email, title, period?, html }   → one report for an approved client
 * Uploading again for the same client and period replaces the earlier report.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const title = String(body.title ?? '').trim().slice(0, 200);
    const period = String(body.period ?? '').trim().slice(0, 60) || null;
    const html = typeof body.html === 'string' ? body.html : '';

    if (!email || !title || !html.trim()) {
      return NextResponse.json({ error: 'Client email, a title and the report file are required' }, { status: 400 });
    }
    if (Buffer.byteLength(html, 'utf8') > MAX_REPORT_BYTES) {
      return NextResponse.json({ error: `Report is larger than ${MAX_REPORT_BYTES / 1024 / 1024} MB` }, { status: 413 });
    }
    if (!/<\s*(html|body|div|svg|script|table)\b/i.test(html)) {
      return NextResponse.json({ error: 'That file does not look like an HTML report' }, { status: 400 });
    }

    const client = await prisma.approvedClient.findUnique({ where: { email }, select: { id: true } });
    if (!client) {
      return NextResponse.json({ error: `${email} is not on the client list. Add them in Client Access first.` }, { status: 404 });
    }

    // Same client + same period → replace, so re-uploading a corrected report does not pile up copies
    const existing = period
      ? await prisma.clientReport.findFirst({ where: { clientId: client.id, period }, select: { id: true } })
      : null;
    const report = existing
      ? await prisma.clientReport.update({ where: { id: existing.id }, data: { title, html, isPublished: true }, select: { id: true } })
      : await prisma.clientReport.create({ data: { clientId: client.id, title, period, html }, select: { id: true } });

    return NextResponse.json({ success: true, id: report.id, replaced: Boolean(existing) });
  } catch (error) {
    console.error('[AdminReports] Save failed:', error);
    return NextResponse.json({ error: 'Could not save the report. Please try again.' }, { status: 500 });
  }
}
