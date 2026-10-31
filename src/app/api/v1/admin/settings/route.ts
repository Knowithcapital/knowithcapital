import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/guards';
import { DEFAULT_RISK_FREE_PCT, INDIAN_MF_CACHE_TAG } from '@/lib/services/indianMutualFunds';
import { DEFAULT_ACTIVE_GAMES } from '@/lib/games/defaults';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/settings — { riskFreeRatePct, isDefault } */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const cfg = await prisma.appConfig.findUnique({ where: { id: 'default' }, select: { riskFreeRatePct: true } });
    const value = cfg?.riskFreeRatePct;
    return NextResponse.json({ riskFreeRatePct: value ?? DEFAULT_RISK_FREE_PCT, isDefault: value == null, defaultPct: DEFAULT_RISK_FREE_PCT });
  } catch (error) {
    console.error('[AdminSettings] Load failed:', (error as Error).message);
    return NextResponse.json({ riskFreeRatePct: DEFAULT_RISK_FREE_PCT, isDefault: true, defaultPct: DEFAULT_RISK_FREE_PCT, notReady: true });
  }
}

/** PUT /api/v1/admin/settings — { riskFreeRatePct: number | null } (null restores the default) */
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const raw = body.riskFreeRatePct;
  const value = raw === null ? null : typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 25)) {
    return NextResponse.json({ error: 'Enter a rate between 0 and 25 (percent per year)' }, { status: 400 });
  }
  const rounded = value === null ? null : Math.round(value * 100) / 100;

  try {
    // If no row exists yet, create it with every game switched on so saving this setting never hides games
    await prisma.appConfig.upsert({
      where: { id: 'default' },
      update: { riskFreeRatePct: rounded },
      create: { id: 'default', activeGames: DEFAULT_ACTIVE_GAMES, riskFreeRatePct: rounded },
    });
    // Expire the cached fund report so Sharpe ratios are recalculated with the new rate
    revalidateTag(INDIAN_MF_CACHE_TAG, 'max');
    return NextResponse.json({ success: true, riskFreeRatePct: rounded ?? DEFAULT_RISK_FREE_PCT });
  } catch (error) {
    console.error('[AdminSettings] Save failed:', error);
    return NextResponse.json({ error: 'Could not save. Run `npx prisma db push` (or redeploy) so the new setting column exists.' }, { status: 500 });
  }
}
