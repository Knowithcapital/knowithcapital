import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { loadLibrary } from '@/lib/tracker/store';

export const dynamic = 'force-dynamic';

const TEMPLATE = path.join(process.cwd(), 'src', 'lib', 'tracker', 'template.html');

const page = (body: string) =>
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quarterly Results Tracker</title>` +
  `<body style="font:15px/1.5 system-ui,sans-serif;background:#F6F3EC;color:#0B2E33;padding:40px 20px;text-align:center">${body}</body>`;

/**
 * GET /api/v1/quarterly-results/frame — the Quarterly Results Tracker as a page of its own, with the library
 * read from the database and placed into the template (the same job build.py used to do).
 * The Insights page shows it in a sandboxed frame. Cached for a few minutes at the edge.
 */
export async function GET() {
  const lib = await loadLibrary();
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    // The page is sandboxed by its own headers (opaque origin: its scripts cannot reach the site, its cookies or its APIs),
    // allowed to run inline script and style only, and nothing it loads can call out except the font stylesheet
    'Content-Security-Policy': [
      'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox', "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline' https://fonts.googleapis.com",
      'font-src https://fonts.gstatic.com', 'img-src data: https:', "connect-src 'none'", "base-uri 'none'",
      "form-action 'none'", "frame-ancestors 'self'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };

  if (!lib || lib.results.length === 0) {
    return new NextResponse(page('<h2 style="font-family:Georgia,serif">Quarterly Results Tracker</h2><p>The tracker data is being loaded. Please check back shortly.</p>'), {
      headers: { ...headers, 'Cache-Control': 'public, s-maxage=30' },
    });
  }

  const template = await fs.readFile(TEMPLATE, 'utf-8');
  // Safe to place inside a <script>: no "</script>", no "<!--", no line-separator characters
  const json = JSON.stringify(lib)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
  const html = template.replace('/*__DATA__*/', () => json);
  return new NextResponse(html, { headers: { ...headers, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
