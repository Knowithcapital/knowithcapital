import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/guards';
import {
  deletePrivate, inspectPrivate, isPortfolioKey, newPortfolioKey, privateMaxBytes, privateStorageMode, savePrivateLocal,
} from '@/lib/storage';
import { dateFromFileName, parseReportDate } from '@/lib/portfolioReport';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/portfolio-reports — each client's current report (one per client) and the storage mode */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const reports = await prisma.portfolioReport.findMany({
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true, fileName: true, fileSize: true, reportDate: true, uploadedAt: true,
        client: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ reports, storage: privateStorageMode(), maxBytes: privateMaxBytes() });
  } catch (error) {
    console.error('[PortfolioReports] List failed:', error);
    return NextResponse.json({ error: 'Report table is not ready. Run `npx prisma db push` (or redeploy) to create it.' }, { status: 500 });
  }
}

/**
 * POST /api/v1/admin/portfolio-reports — attach a PDF to a client, replacing their previous report.
 *   JSON (cloud):    { email, key, fileName, reportDate? } after the browser has uploaded the file using /upload-url
 *   multipart (dev): fields email, file, reportDate?  — local development only
 * The old report's file is deleted once the new one is saved.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const mode = privateStorageMode();
  if (mode === 'none') {
    return NextResponse.json({ error: 'Private file storage is not configured. Connect Cloudinary (CLOUDINARY_URL) or Cloudflare R2 (R2_*) on the project.' }, { status: 503 });
  }

  let key = '';
  let email = '';
  let fileName = '';
  let reportDateInput: unknown;
  let createdHere = false; // a file we should delete again if this request fails

  try {
    if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      if (mode !== 'local') return NextResponse.json({ error: 'Upload the file using the storage upload link' }, { status: 400 });
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      email = String(form.get('email') ?? '');
      reportDateInput = form.get('reportDate');
      fileName = file.name;
      key = newPortfolioKey();
      await savePrivateLocal(key, Buffer.from(await file.arrayBuffer()));
      createdHere = true;
    } else {
      const body = await req.json();
      email = String(body.email ?? '');
      key = body.key;
      fileName = String(body.fileName ?? 'report.pdf');
      reportDateInput = body.reportDate;
      if (!isPortfolioKey(key)) return NextResponse.json({ error: 'Invalid file reference' }, { status: 400 });
      createdHere = true;
    }

    const fail = async (status: number, error: string) => {
      if (createdHere) await deletePrivate(key);
      return NextResponse.json({ error }, { status });
    };

    const normalized = email.trim().toLowerCase();
    const client = await prisma.approvedClient.findUnique({ where: { email: normalized }, select: { id: true, isActive: true } });
    if (!client) return fail(404, `${normalized || 'That email'} is not on the client list. Add them in Client Access first.`);
    if (!client.isActive) return fail(400, 'That client is suspended. Re-activate them in Client Access first.');

    // Check the stored object is really a PDF of a sensible size
    const stored = await inspectPrivate(key);
    if (!stored) return fail(400, 'The uploaded file was not found in storage. Please try the upload again.');
    if (stored.size > privateMaxBytes()) return fail(413, `The PDF is larger than ${privateMaxBytes() / 1024 / 1024} MB.`);
    if (!stored.head.startsWith('%PDF-')) return fail(400, 'That file is not a PDF.');

    if (await prisma.portfolioReport.findFirst({ where: { fileKey: key }, select: { id: true } })) {
      return NextResponse.json({ error: 'That file is already attached to a report' }, { status: 409 });
    }

    const reportDate = parseReportDate(reportDateInput) ?? parseReportDate(dateFromFileName(fileName));
    const previous = await prisma.portfolioReport.findUnique({ where: { clientId: client.id }, select: { fileKey: true } });

    const saved = await prisma.portfolioReport.upsert({
      where: { clientId: client.id },
      create: { clientId: client.id, fileKey: key, fileName: fileName.slice(0, 200), fileSize: stored.size, reportDate },
      update: { fileKey: key, fileName: fileName.slice(0, 200), fileSize: stored.size, reportDate, uploadedAt: new Date() },
      select: { id: true },
    });

    // The new report is saved; remove the previous one so only the latest is kept
    if (previous && previous.fileKey !== key) await deletePrivate(previous.fileKey);

    return NextResponse.json({ success: true, id: saved.id, replaced: Boolean(previous) });
  } catch (error) {
    console.error('[PortfolioReports] Save failed:', error);
    if (createdHere && key) await deletePrivate(key);
    return NextResponse.json({ error: 'Could not save the report. Please try again.' }, { status: 500 });
  }
}
