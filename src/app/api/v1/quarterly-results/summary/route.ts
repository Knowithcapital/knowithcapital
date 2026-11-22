import { NextResponse } from 'next/server';
import { loadSummary } from '@/lib/tracker/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/quarterly-results/summary — season, last update and counts, for the card on the Insights page */
export async function GET() {
  const summary = await loadSummary();
  return NextResponse.json({ summary }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
