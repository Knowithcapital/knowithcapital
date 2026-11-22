"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, ExternalLink, FileJson, Upload } from 'lucide-react';

type Counts = Record<'results' | 'deals' | 'monthly' | 'events' | 'xposts', number>;
type Summary = {
  title: string; season: string; quarter: string; updated_at: string;
  totals: Counts; pending: Record<string, number>; reported: number; checked: number;
};
type HistoryRow = {
  id: string; createdAt: string; mode: 'merge' | 'replace'; fileName: string | null;
  added: Counts; replaced: Counts; skipped: number; totals: Counts; updatedBy: string | null;
};
type Outcome = { added: Counts; replaced: Counts; skipped: { section: string; reason: string; sample: string }[]; skippedCount: number };

const SECTION_LABELS: Record<string, string> = { results: 'Results', deals: 'Deals', monthly: 'Monthly numbers', events: 'News and events', xposts: 'X posts' };
const SECTIONS = ['results', 'deals', 'monthly', 'events', 'xposts'] as const;

const sum = (c: Counts) => SECTIONS.reduce((n, s) => n + (c?.[s] ?? 0), 0);
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function ResultsTrackerAdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<{ name: string; payload: Record<string, unknown> } | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const load = async () => {
    const res = await fetch('/api/v1/admin/tracker');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Could not load the tracker');
    setSummary(json.summary);
    setHistory(json.history || []);
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/admin/tracker')
      .then(async res => { const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Could not load the tracker'); return json; })
      .then(json => { if (!cancelled) { setSummary(json.summary); setHistory(json.history || []); } })
      .catch(e => { if (!cancelled) setMessage({ ok: false, text: (e as Error).message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    setOutcome(null);
    setMessage(null);
    try {
      const payload = JSON.parse(await f.text());
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('not an object');
      if (!SECTIONS.some(s => Array.isArray(payload[s]))) throw new Error('no results, deals, monthly, events or xposts lists');
      setFile({ name: f.name, payload });
      // A whole library.json carries the quarter archive; an update file (new.json) does not
      setMode(payload.quarters && payload.meta ? 'replace' : 'merge');
    } catch (e) {
      setFile(null);
      setMessage({ ok: false, text: `That file could not be used: ${(e as Error).message}. Choose the update file (new.json) or the full library.json.` });
    }
  };

  const apply = async () => {
    if (!file) return;
    if (mode === 'replace' && !window.confirm('Replace the whole tracker with this file? Anything in the tracker that is not in the file is lost. You can download the current library first.')) return;
    setBusy(true);
    setMessage(null);
    setOutcome(null);
    try {
      const res = await fetch('/api/v1/admin/tracker', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, fileName: file.name, payload: file.payload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'The update failed');
      setOutcome(json);
      setMessage({ ok: true, text: 'Updated. The Insights page shows the new data within about five minutes.' });
      setFile(null);
      await load();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Results Tracker</h1>
            <p className="text-gray-400 mt-2 text-sm max-w-2xl">
              The Quarterly Results Tracker shown on the Insights page. Its data is kept in the website database. To update it, upload the
              update file your collection process produces (<b>new.json</b>): new items are added, and an item whose key matches an existing
              one replaces it. Dates, links and required fields are checked, the double-check flags and the sector summary are recomputed exactly as before.
            </p>
          </div>
          <a href="/insights/quarterly-results" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#1E1E2E] border border-[#2E2E3E] hover:border-blue-500">
            <ExternalLink className="w-4 h-4" /> View on the website
          </a>
        </div>

        {message && (
          <div className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${message.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
            {message.ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="p-5 rounded-2xl border border-[#2E2E3E] bg-[#0A0A0F]">
          {loading ? <p className="text-gray-400">Loading…</p> : !summary ? (
            <p className="text-gray-400 text-sm">No tracker data has been loaded yet. Upload your <b>library.json</b> below to start.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-lg font-semibold">{summary.season || summary.quarter}</div>
                <div className="text-xs text-gray-500">Last updated {summary.updated_at.replace('T', ' ').replace(/\+05:30$/, '')} IST</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {SECTIONS.map(s => (
                  <div key={s} className="rounded-xl border border-[#2E2E3E] bg-[#111] p-3">
                    <div className="text-xs text-gray-400">{SECTION_LABELS[s]}</div>
                    <div className="text-2xl font-semibold mt-1">{summary.totals[s].toLocaleString('en-IN')}</div>
                    {summary.pending[s] !== undefined && (
                      <div className="text-[11px] text-gray-500 mt-1">{summary.pending[s]} not yet double-checked</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500">
                {summary.reported} results this quarter, {summary.checked} verified against an NSE filing. Only verified results feed the sector summary.
              </div>
              <a href="/api/v1/admin/tracker/export" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 w-fit">
                <Download className="w-4 h-4" /> Download the current library.json
              </a>
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl border border-[#2E2E3E] bg-[#0A0A0F] flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 cursor-pointer">
              <Upload className="w-4 h-4" /> Choose update file (.json)
              <input type="file" accept=".json,application/json" className="hidden" onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <span className="text-xs text-gray-500">Up to about 4 MB. Use <b>new.json</b> for a normal update, or a full <b>library.json</b> to load or restore everything.</span>
          </div>

          {file && (
            <div className="rounded-lg border border-[#2E2E3E] bg-[#111] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm"><FileJson className="w-4 h-4 text-gray-500" /> {file.name}
                <span className="text-gray-500 text-xs">
                  ({SECTIONS.filter(s => Array.isArray(file.payload[s])).map(s => `${(file.payload[s] as unknown[]).length} ${SECTION_LABELS[s].toLowerCase()}`).join(', ')})
                </span>
              </div>
              <div className="flex flex-wrap gap-5 text-sm">
                <label className="inline-flex items-center gap-2"><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Add to the tracker and replace matching items</label>
                <label className="inline-flex items-center gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace the whole tracker</label>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setFile(null)} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-[#1E1E2E] border border-[#2E2E3E]">Cancel</button>
                <button onClick={apply} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 disabled:opacity-50">{busy ? 'Updating…' : 'Apply update'}</button>
              </div>
            </div>
          )}

          {outcome && (
            <div className="rounded-lg border border-[#2E2E3E] bg-[#111] p-4 text-sm flex flex-col gap-2">
              <div className="text-gray-300">
                {sum(outcome.added)} added, {sum(outcome.replaced)} replaced{outcome.skippedCount ? `, ${outcome.skippedCount} skipped` : ''}.
              </div>
              <div className="text-xs text-gray-500">
                {SECTIONS.filter(s => outcome.added[s] || outcome.replaced[s]).map(s => `${SECTION_LABELS[s]}: +${outcome.added[s]} / ${outcome.replaced[s]} replaced`).join(' · ') || 'No items changed (only the summary was refreshed).'}
              </div>
              {outcome.skipped.length > 0 && (
                <ul className="text-xs text-amber-300/90 list-disc pl-5">
                  {outcome.skipped.map((s, i) => <li key={i}>{SECTION_LABELS[s.section]}: {s.reason} <span className="text-gray-500">({s.sample})</span></li>)}
                  {outcome.skippedCount > outcome.skipped.length && <li>…and {outcome.skippedCount - outcome.skipped.length} more</li>}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#151515]/60 border border-[#2E2E3E]/50 rounded-2xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Update history</h2>
          {history.length === 0 ? <p className="text-sm text-gray-500">No updates yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="text-xs uppercase bg-[#1E1E2E]/40 border-b border-[#2E2E3E]/50">
                  <tr><th className="px-4 py-3 font-medium">When</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">File</th><th className="px-4 py-3 font-medium">Added</th><th className="px-4 py-3 font-medium">Replaced</th><th className="px-4 py-3 font-medium">Skipped</th><th className="px-4 py-3 font-medium">By</th></tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-b border-[#2E2E3E]/50">
                      <td className="px-4 py-3 whitespace-nowrap">{when(h.createdAt)}</td>
                      <td className="px-4 py-3">{h.mode === 'replace' ? 'Full replace' : 'Update'}</td>
                      <td className="px-4 py-3">{h.fileName || '—'}</td>
                      <td className="px-4 py-3">{sum(h.added)}</td>
                      <td className="px-4 py-3">{sum(h.replaced)}</td>
                      <td className="px-4 py-3">{h.skipped}</td>
                      <td className="px-4 py-3">{h.updatedBy || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
