import { NextResponse } from 'next/server';

/** Largest HTML report we accept (the request body limit on the host is about 4.5 MB). */
export const MAX_REPORT_BYTES = 4 * 1024 * 1024;

/**
 * Serves an uploaded report as a page of its own. The `sandbox` CSP gives the document an opaque
 * origin, so its scripts (charts, tooltips) run but cannot read our cookies, call our APIs as the
 * signed-in user, or navigate the parent page.
 */
export function reportResponse(html: string): NextResponse {
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': 'sandbox allow-scripts allow-popups allow-downloads',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'private, no-store',
    },
  });
}
