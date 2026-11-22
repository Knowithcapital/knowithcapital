import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, requireAdmin } from '@/lib/auth/guards';
import { loadHistory, loadSummary, mergeUpdate, replaceLibrary } from '@/lib/tracker/store';
import type { UpdateInput } from '@/lib/tracker/merge';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/tracker — current state and the update history */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const [summary, history] = await Promise.all([loadSummary(), loadHistory()]);
  return NextResponse.json({ summary, history });
}

/**
 * POST /api/v1/admin/tracker — { mode: 'merge' | 'replace', fileName?, payload }
 *   merge   : payload is an update file (new.json): new items are added, items with a matching key replace the old ones
 *   replace : payload is a whole library.json and becomes the library
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || (body.mode !== 'merge' && body.mode !== 'replace') || typeof body.payload !== 'object' || body.payload === null) {
    return NextResponse.json({ error: 'Send { mode: "merge" | "replace", payload: <the JSON file> }' }, { status: 400 });
  }
  const who = (await getAdminSession())?.email ?? null;
  const fileName = typeof body.fileName === 'string' ? body.fileName : undefined;

  try {
    const outcome = body.mode === 'replace'
      ? await replaceLibrary(body.payload, who, fileName)
      : await mergeUpdate(body.payload as UpdateInput, who, fileName);
    return NextResponse.json({
      success: true,
      added: outcome.added,
      replaced: outcome.replaced,
      skipped: outcome.skipped.slice(0, 20),
      skippedCount: outcome.skipped.length,
    });
  } catch (error) {
    const message = (error as Error).message || 'Update failed';
    console.error('[AdminTracker] Update failed:', message);
    // Validation problems read as plain sentences; anything else is a server problem
    const clientError = /^(The file|Nothing could|Send )/.test(message);
    return NextResponse.json({ error: clientError ? message : 'The update could not be saved. If this keeps happening, run `npx prisma db push` (or redeploy) so the tracker tables exist.' }, { status: clientError ? 400 : 500 });
  }
}
