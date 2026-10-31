"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2 } from 'lucide-react';

type Report = { id: string; title: string; period: string | null; createdAt: string };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** The signed-in client's own portfolio report(s), uploaded by Knowith Capital. */
export default function MyPortfolioPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/me/reports')
      .then(async res => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not load your reports');
        return (json.reports || []) as Report[];
      })
      .then(list => { if (!cancelled) { setReports(list); setSelectedId(list[0]?.id ?? null); } })
      .catch(e => { if (!cancelled) { setError((e as Error).message); setReports([]); } });
    return () => { cancelled = true; };
  }, []);

  const selected = reports?.find(r => r.id === selectedId);

  return (
    <div className="min-h-full bg-[#F6F3EC] text-[#0B2E33] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <div className="text-[10px] font-mono tracking-widest uppercase text-[#B8873D]">Your portfolio</div>
          <h1 className="text-3xl font-serif mt-1">Portfolio report</h1>
          <p className="text-sm text-[#42504F] mt-2 max-w-2xl">
            Your latest portfolio review, prepared by Knowith Capital. It is visible only to you after you sign in with your email code.
          </p>
        </div>

        {reports === null ? (
          <div className="flex items-center gap-3 text-[#42504F] py-16 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading your report…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 p-4 text-sm">{error}</div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D9CFB8] bg-white/60 p-10 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-[#B8873D]" />
            <h2 className="font-serif text-xl">Your report is not ready yet</h2>
            <p className="text-sm text-[#42504F] mt-2 max-w-md mx-auto">
              We upload portfolio reports periodically. If you expected to see one, please get in touch and we will look into it.
            </p>
            <Link href="/contact" className="inline-block mt-5 text-sm font-semibold text-[#B8873D] hover:underline">Contact us →</Link>
          </div>
        ) : (
          <>
            {reports.length > 1 && (
              <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Report period">
                {reports.map(r => (
                  <button
                    key={r.id}
                    role="tab"
                    aria-selected={r.id === selectedId}
                    onClick={() => setSelectedId(r.id)}
                    className={`px-4 py-2 rounded-full text-sm border ${r.id === selectedId ? 'bg-[#0B2E33] text-[#F6F3EC] border-[#0B2E33]' : 'bg-white border-[#D9CFB8] text-[#42504F] hover:border-[#B8873D]'}`}
                  >
                    {r.period || formatDate(r.createdAt)}
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <div className="rounded-2xl border border-[#E8E2D2] bg-white overflow-hidden shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-[#E8E2D2] text-sm">
                  <span className="font-semibold">{selected.title}</span>
                  <span className="text-[#6B7876]">Uploaded {formatDate(selected.createdAt)}</span>
                </div>
                {/* The report is served with a sandbox CSP, so its scripts cannot touch this page or your session */}
                <iframe
                  key={selected.id}
                  src={`/api/v1/me/reports/${selected.id}/view`}
                  title={selected.title}
                  sandbox="allow-scripts allow-popups allow-downloads"
                  className="w-full border-0 bg-white"
                  style={{ height: 'min(85vh, 1100px)', minHeight: 520 }}
                />
              </div>
            )}
            <p className="text-xs text-[#6B7876]">
              Past performance is not indicative of future returns. Mutual fund investments are subject to market risks; read all scheme-related documents carefully.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
