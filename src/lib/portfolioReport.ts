import { NextResponse } from 'next/server';
import { fetchPrivateFromCloudinary, privateFileUrl, privateStorageMode, readPrivateLocal, safeFileName } from '@/lib/storage';

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
 * Cloudinary → the file streamed from a signed server-side request (its address is never shown to the client);
 * R2 → a redirect to a one-minute signed link; local development → the file itself.
 */
export async function sendPortfolioFile(key: string, fileName: string, download: boolean): Promise<NextResponse> {
  const disposition = `${download ? 'attachment' : 'inline'}; filename="${safeFileName(fileName) || 'report.pdf'}"`;
  if (privateStorageMode() === 'cloudinary') {
    const upstream = await fetchPrivateFromCloudinary(key);
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: 'The report file could not be found' }, { status: 404 });
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    const length = upstream.headers.get('content-length');
    if (length) headers['Content-Length'] = length;
    return new NextResponse(upstream.body, { headers });
  }
  if (privateStorageMode() === 'r2') {
    const url = await privateFileUrl(key, fileName, download);
    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
  }
  try {
    const bytes = await readPrivateLocal(key);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'The report file could not be found' }, { status: 404 });
  }
}
