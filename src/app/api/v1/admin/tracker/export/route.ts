import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { loadLibrary } from '@/lib/tracker/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/tracker/export — the current library as library.json (for the offline build.py workflow) */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const lib = await loadLibrary();
  if (!lib) return NextResponse.json({ error: 'No library has been loaded yet' }, { status: 404 });
  return new NextResponse(JSON.stringify(lib, null, 1), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="library.json"',
      'Cache-Control': 'private, no-store',
    },
  });
}
