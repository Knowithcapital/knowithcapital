import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { createPublicUpload, publicStorageMode, saveFile, safeFileName } from '@/lib/storage';
import { requireAdmin } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_BYTES = 30 * 1024 * 1024;

/** Tells the admin UI which upload path to use. */
export async function GET() {
  return NextResponse.json({ mode: publicStorageMode() });
}

/**
 * Public uploads (insight PDFs and images), by storage backend:
 *   • cloudinary / r2 — JSON { fileName, contentType, size, folder? }: returns a one-time signed upload
 *              the browser sends the file to directly (no app-server size limit).
 *   • blob   — JSON: Vercel Blob client-upload handshake (legacy).
 *   • local  — multipart form (development only).
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const contentType = req.headers.get('content-type') ?? '';
  const mode = publicStorageMode();

  if (contentType.includes('application/json')) {
    if (mode === 'r2' || mode === 'cloudinary') {
      try {
        const { fileName, contentType: fileType, size, folder } = await req.json();
        if (typeof fileName !== 'string' || !ALLOWED_TYPES.includes(fileType)) {
          return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }
        if (typeof size !== 'number' || size <= 0 || size > MAX_BYTES) {
          return NextResponse.json({ error: `Files must be smaller than ${MAX_BYTES / 1024 / 1024} MB` }, { status: 400 });
        }
        const safeFolder = typeof folder === 'string' && /^[a-z0-9-]{1,30}$/.test(folder) ? folder : 'uploads';
        return NextResponse.json(await createPublicUpload(safeFolder, fileName, fileType));
      } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 });
      }
    }

    try {
      const body = (await req.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        }),
      });
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
  }

  if (mode !== 'local' || (process.env.VERCEL && process.env.NODE_ENV === 'production')) {
    return NextResponse.json({ error: 'Direct uploads must go through the storage upload link' }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Unsupported file type or file too large' }, { status: 400 });
  }
  const url = await saveFile(safeFileName(file.name), await file.arrayBuffer(), file.type);
  return NextResponse.json({ url });
}
