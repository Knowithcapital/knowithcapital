import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { createPrivateUpload, newPortfolioKey, privateStorageMode } from '@/lib/storage';
import { MAX_PORTFOLIO_PDF_BYTES } from '@/lib/portfolioReport';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/portfolio-reports/upload-url — { fileName, size }
 * R2: returns { mode: 'r2', key, uploadUrl }. The browser PUTs the PDF straight to the private bucket
 * (these files are far larger than the app server accepts), then calls POST /api/v1/admin/portfolio-reports.
 * Local development: returns { mode: 'local' } and the file is posted to the main route instead.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const mode = privateStorageMode();
  if (mode === 'none') {
    return NextResponse.json({ error: 'Private file storage is not configured. Set the Cloudflare R2 variables (R2_*) on the project.' }, { status: 503 });
  }

  const { fileName, size } = await req.json().catch(() => ({}));
  if (typeof fileName !== 'string' || !/\.pdf$/i.test(fileName)) {
    return NextResponse.json({ error: 'Choose a PDF file' }, { status: 400 });
  }
  if (typeof size !== 'number' || size <= 0 || size > MAX_PORTFOLIO_PDF_BYTES) {
    return NextResponse.json({ error: `The PDF must be smaller than ${MAX_PORTFOLIO_PDF_BYTES / 1024 / 1024} MB` }, { status: 400 });
  }
  if (mode === 'local') return NextResponse.json({ mode });

  const key = newPortfolioKey();
  return NextResponse.json({ mode, key, uploadUrl: await createPrivateUpload(key) });
}
