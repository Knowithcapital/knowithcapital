"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';

type Report = { fileName: string; fileSize: number; reportDate: string | null; uploadedAt: string };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** The signed-in client's own monthly portfolio report (PDF): view it here or download it. */
export default function MyPortfolioPage() {
  const [report, setReport] = useState<Report | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/me/portfolio-report')
      .then(async res => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not load your report');
        return (json.report ?? null) as Report | null;
      })
      .then(r => { if (!cancelled) setReport(r); })
      .catch(e => { if (!cancelled) { setError((e as Error).message); setReport(null); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-full bg-[#F6F3EC] text-[#0B2E33] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <div className="text-[10px] font-mono tracking-widest uppercase text-[#B8873D]">Your portfolio</div>
          <h1 className="text-3xl font-serif mt-1">Portfolio report</h1>
          <p className="text-sm text-[#42504F] mt-2 max-w-2xl">
            Your latest monthly portfolio report, prepared by Knowith Capital. Only you can see it after signing in with your email code.
          </p>
        </div>

        {report === undefined ? (
          <div className="flex items-center gap-3 text-[#42504F] py-16 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading your report…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 p-4 text-sm">{error}</div>
        ) : report === null ? (
          <div className="rounded-2xl border border-dashed border-[#D9CFB8] bg-white/60 p-10 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-[#B8873D]" />
            <h2 className="font-serif text-xl">Your report is not ready yet</h2>
            <p className="text-sm text-[#42504F] mt-2 max-w-md mx-auto">
              We upload portfolio reports every month. If you expected to see one, please get in touch and we will look into it.
            </p>
            <Link href="/contact" className="inline-block mt-5 text-sm font-semibold text-[#B8873D] hover:underline">Contact us →</Link>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-[#E8E2D2] bg-white p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0 w-11 h-11 rounded-lg bg-[#0B2E33] text-[#D9B978] flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {report.reportDate ? `Portfolio values as on ${formatDate(report.reportDate)}` : 'Portfolio report'}
                  </div>
                  <div className="text-xs text-[#6B7876] mt-0.5 truncate">
                    {report.fileName} · {formatSize(report.fileSize)} · uploaded {formatDate(report.uploadedAt)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/api/v1/me/portfolio-report/file" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#D9CFB8] bg-white hover:border-[#B8873D]">
                  <ExternalLink className="w-4 h-4" /> Open in new tab
                </a>
                <a href="/api/v1/me/portfolio-report/file?download=1"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0B2E33] text-[#F6F3EC] hover:bg-[#0F3A3F]">
                  <Download className="w-4 h-4" /> Download PDF
                </a>
              </div>
            </div>

            {/* Phones often cannot show a PDF inside a page, so the buttons above are the main way in; the viewer is for larger screens */}
            <div className="hidden md:block rounded-2xl border border-[#E8E2D2] bg-white overflow-hidden shadow-sm">
              <iframe
                src="/api/v1/me/portfolio-report/file#view=FitH"
                title="Portfolio report"
                className="w-full border-0 bg-white"
                style={{ height: 'min(85vh, 1100px)', minHeight: 520 }}
              />
            </div>
            <p className="md:hidden text-sm text-[#42504F]">Tap <b>Open in new tab</b> or <b>Download PDF</b> to read your report.</p>

            <p className="text-xs text-[#6B7876]">
              Past performance is not indicative of future returns. Mutual fund investments are subject to market risks; read all scheme-related documents carefully.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
