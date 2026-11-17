import { NextResponse } from 'next/server';
import { privateFileUrl, privateStorageMode, readPrivateLocal, safeFileName } from '@/lib/storage';

/** Largest portfolio PDF accepted. (Detailed family reports run to tens of MB.) */
export const MAX_PORTFOLIO_PDF_BYTES = 60 * 1024 * 1024;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Finds a report date in a file name such as "…-Report-16-Nov-2026.pdf" or "…2026-11-16…".
 * Returns an ISO date (YYYY-MM-DD) or null.
 */
export function dateFromFileName(fileName: string): string | null {
  const named = /(\d{1,2})[\s._-]+([A-Za-z]{3})[A-Za-z]*[\s._-]+(\d{4})/.exec(fileName);
  if (named) {
    const month = MONTHS.indexOf(named[2].toLowerCase());
    if (month >= 0) return toIso(+named[3], month + 1, +named[1]);
  }
  const iso = /(\d{4})[-_.](\d{2})[-_.](\d{2})/.exec(fileName);
  return iso ? toIso(+iso[1], +iso[2], +iso[3]) : null;
}

function toIso(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    ? date.toISOString().slice(0, 10)
    : null;
}

/** Parses a YYYY-MM-DD string into a Date for a @db.Date column, or null if it is not a real date. */
export function parseReportDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return toIso(y, m, d) ? new Date(Date.UTC(y, m - 1, d)) : null;
}

/**
 * Sends a stored report to a caller that has already been authorised:
 * R2 → a redirect to a one-minute signed link; local development → the file itself.
 */
export async function sendPortfolioFile(key: string, fileName: string, download: boolean): Promise<NextResponse> {
  if (privateStorageMode() === 'r2') {
    const url = await privateFileUrl(key, fileName, download);
    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
  }
  try {
    const bytes = await readPrivateLocal(key);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeFileName(fileName) || 'report.pdf'}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'The report file could not be found' }, { status: 404 });
  }
}
