import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { createPrivateUpload, newPortfolioKey, privateMaxBytes, privateStorageMode } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/portfolio-reports/upload-url — { fileName, size }
 * Cloudinary: { mode, key, uploadUrl, fields }: the browser POSTs the PDF (with those fields) straight to private storage.
 * R2: { mode, key, uploadUrl }: the browser PUTs the PDF to the private bucket.
 * Either way the file never passes through the app server (these PDFs are larger than it accepts), and the browser then
 * calls POST /api/v1/admin/portfolio-reports to attach the file to the client.
 * Local development: returns { mode: 'local' } and the file is posted to the main route instead.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const mode = privateStorageMode();
  if (mode === 'none') {
    return NextResponse.json({ error: 'Private file storage is not configured. Connect Cloudinary (CLOUDINARY_URL) or Cloudflare R2 (R2_*) on the project.' }, { status: 503 });
  }

  const { fileName, size } = await req.json().catch(() => ({}));
  if (typeof fileName !== 'string' || !/\.pdf$/i.test(fileName)) {
    return NextResponse.json({ error: 'Choose a PDF file' }, { status: 400 });
  }
  const max = privateMaxBytes();
  if (typeof size !== 'number' || size <= 0 || size > max) {
    return NextResponse.json({ error: `The PDF must be smaller than ${max / 1024 / 1024} MB. Compress it, or use a storage plan that allows larger files.` }, { status: 400 });
  }
  if (mode === 'local') return NextResponse.json({ mode });

  const key = newPortfolioKey();
  return NextResponse.json({ ...(await createPrivateUpload(key)), key });
}
