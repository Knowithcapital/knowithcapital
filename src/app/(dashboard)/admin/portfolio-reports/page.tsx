"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, FileText, Trash2, Upload, X, ExternalLink } from 'lucide-react';

type Report = {
  id: string; title: string; period: string | null; isPublished: boolean; createdAt: string;
  client: { id: string; name: string | null; email: string };
};
type Client = { id: string; name: string | null; email: string };
type Pending = { key: string; fileName: string; html: string; size: number; email: string; title: string; status: 'ready' | 'saving' | 'done' | 'error'; note?: string };

const inputClass = 'bg-[#0A0A0F] border border-[#2E2E3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500';
const MAX_BYTES = 4 * 1024 * 1024;

/** Current month as a label, e.g. "October 2026" */
const monthLabel = () => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

/** Pre-fill the client from the file name: an email in the name, or the client's name (spaces, dashes or underscores). */
function guessClient(fileName: string, clients: Client[]): string {
  const base = fileName.replace(/\.[^.]+$/, '').toLowerCase();
  const byEmail = clients.find(c => base.includes(c.email.toLowerCase()));
  if (byEmail) return byEmail.email;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const nameKey = norm(base);
  const byName = clients.filter(c => c.name && norm(c.name) && nameKey.includes(norm(c.name)));
  return byName.length === 1 ? byName[0].email : '';
}

export default function PortfolioReportsAdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [period, setPeriod] = useState(monthLabel());
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/client-reports');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load reports');
      setReports(json.reports || []);
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/v1/admin/client-reports').then(async r => ({ ok: r.ok, json: await r.json() })),
      fetch('/api/v1/admin/clients').then(r => r.json()),
    ])
      .then(([rep, cl]) => {
        if (cancelled) return;
        if (rep.ok) setReports(rep.json.reports || []); else setMessage({ ok: false, text: rep.json.error || 'Could not load reports' });
        setClients((cl.clients || []).filter((c: Client & { isActive: boolean }) => c.isActive));
      })
      .catch(e => { if (!cancelled) setMessage({ ok: false, text: (e as Error).message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: Pending[] = [];
    for (const f of Array.from(files)) {
      if (!/\.html?$/i.test(f.name)) { setMessage({ ok: false, text: `${f.name} is not an HTML file and was skipped.` }); continue; }
      if (f.size > MAX_BYTES) { setMessage({ ok: false, text: `${f.name} is larger than 4 MB and was skipped.` }); continue; }
      const email = guessClient(f.name, clients);
      const who = clients.find(c => c.email === email);
      next.push({
        key: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
        fileName: f.name, html: await f.text(), size: f.size, email,
        title: `Portfolio report${who?.name ? ` — ${who.name}` : ''}`, status: 'ready',
      });
    }
    setPending(p => [...p, ...next]);
  };

  const update = (key: string, patch: Partial<Pending>) => setPending(p => p.map(x => (x.key === key ? { ...x, ...patch } : x)));

  const uploadAll = async () => {
    setBusy(true);
    setMessage(null);
    let done = 0, failed = 0;
    for (const item of pending) {
      if (item.status === 'done') continue;
      if (!item.email) { update(item.key, { status: 'error', note: 'Choose a client' }); failed++; continue; }
      update(item.key, { status: 'saving', note: undefined });
      try {
        const res = await fetch('/api/v1/admin/client-reports', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: item.email, title: item.title, period, html: item.html }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        update(item.key, { status: 'done', note: json.replaced ? 'Replaced the earlier report for this period' : 'Uploaded' });
        done++;
      } catch (e) {
        update(item.key, { status: 'error', note: (e as Error).message });
        failed++;
      }
    }
    setBusy(false);
    setMessage({ ok: failed === 0, text: `${done} report${done === 1 ? '' : 's'} uploaded${failed ? `, ${failed} need attention` : ''}.` });
    await loadReports();
  };

  const toggle = async (r: Report) => {
    await fetch(`/api/v1/admin/client-reports/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublished: !r.isPublished }) });
    loadReports();
  };
  const remove = async (id: string) => {
    await fetch(`/api/v1/admin/client-reports/${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    loadReports();
  };

  const shown = query.trim()
    ? reports.filter(r => `${r.client.email} ${r.client.name ?? ''} ${r.title}`.toLowerCase().includes(query.trim().toLowerCase()))
    : reports;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Portfolio Reports</h1>
          <p className="text-gray-400 mt-2 text-sm max-w-2xl">
            Upload each client&apos;s exported HTML report. After signing in with their email code, the client sees only their own report under <b>Login → Your portfolio</b>.
            Clients must be on the Client Access list first. Files up to 4 MB.
          </p>
        </div>

        {message && (
          <div className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${message.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
            {message.ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)} aria-label="Dismiss"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="p-5 rounded-2xl border border-[#2E2E3E] bg-[#0A0A0F] flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Report period</label>
              <input value={period} onChange={e => setPeriod(e.target.value)} className={`${inputClass} w-56`} placeholder="e.g. October 2026" />
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 cursor-pointer">
              <Upload className="w-4 h-4" /> Choose HTML file(s)
              <input type="file" multiple accept=".html,.htm,text/html" className="hidden" onChange={e => { pickFiles(e.target.files); e.target.value = ''; }} />
            </label>
            <span className="text-xs text-gray-500">Choosing several files at once uploads them in bulk. Uploading again for the same client and period replaces the earlier report.</span>
          </div>

          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              {pending.map(p => (
                <div key={p.key} className="grid md:grid-cols-[1fr_1.2fr_1.2fr_auto] gap-2 items-center p-3 rounded-lg border border-[#2E2E3E] bg-[#111]">
                  <div className="text-sm truncate" title={p.fileName}><FileText className="inline w-4 h-4 mr-1 text-gray-500" />{p.fileName} <span className="text-gray-500">({Math.round(p.size / 1024)} KB)</span></div>
                  <select value={p.email} onChange={e => update(p.key, { email: e.target.value, status: 'ready', note: undefined })} className={inputClass} aria-label="Client">
                    <option value="">Choose client…</option>
                    {clients.map(c => <option key={c.id} value={c.email}>{c.name ? `${c.name} — ${c.email}` : c.email}</option>)}
                  </select>
                  <input value={p.title} onChange={e => update(p.key, { title: e.target.value })} className={inputClass} aria-label="Title" />
                  <div className="flex items-center gap-2 text-xs min-w-[8rem]">
                    {p.status === 'saving' && <span className="text-gray-400">Uploading…</span>}
                    {p.status === 'done' && <span className="text-emerald-400">{p.note}</span>}
                    {p.status === 'error' && <span className="text-red-400">{p.note}</span>}
                    <button onClick={() => setPending(list => list.filter(x => x.key !== p.key))} aria-label="Remove from list" className="p-1.5 rounded bg-[#1E1E2E] border border-[#2E2E3E]"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <button onClick={() => setPending([])} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-[#1E1E2E] border border-[#2E2E3E]">Clear list</button>
                <button onClick={uploadAll} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 disabled:opacity-50">
                  {busy ? 'Uploading…' : `Upload ${pending.filter(p => p.status !== 'done').length} report${pending.filter(p => p.status !== 'done').length === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#151515]/60 border border-[#2E2E3E]/50 rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
          <input placeholder="Search by client name, email or title" value={query} onChange={e => setQuery(e.target.value)} className={`${inputClass} max-w-sm`} />
          {loading ? (
            <p className="text-gray-400 py-12 text-center">Loading…</p>
          ) : shown.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              {reports.length === 0 ? 'No reports uploaded yet.' : 'No matches.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="text-xs uppercase bg-[#1E1E2E]/40 border-b border-[#2E2E3E]/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Report</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(r => (
                    <tr key={r.id} className={`border-b border-[#2E2E3E]/50 hover:bg-[#1E1E2E]/40 ${r.isPublished ? '' : 'opacity-60'}`}>
                      <td className="px-4 py-3"><div className="text-white">{r.client.name || '—'}</div><div className="text-xs">{r.client.email}</div></td>
                      <td className="px-4 py-3 text-white">{r.title}{!r.isPublished && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-500/15 border border-gray-500/30">Hidden</span>}</td>
                      <td className="px-4 py-3">{r.period || '—'}</td>
                      <td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {confirmDelete === r.id ? (
                            <>
                              <button onClick={() => remove(r.id)} className="text-xs px-2 py-1 rounded bg-red-600 text-white">Delete</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded bg-[#1E1E2E]">Cancel</button>
                            </>
                          ) : (
                            <>
                              <a href={`/api/v1/admin/client-reports/${r.id}/view`} target="_blank" rel="noopener noreferrer" title="Preview" className="p-2 rounded-lg bg-[#1E1E2E] border border-[#2E2E3E] hover:border-blue-500"><ExternalLink className="w-4 h-4" /></a>
                              <button onClick={() => toggle(r)} title={r.isPublished ? 'Hide from the client' : 'Show to the client'} className="p-2 rounded-lg bg-[#1E1E2E] border border-[#2E2E3E] hover:border-blue-500">
                                {r.isPublished ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                              </button>
                              <button onClick={() => setConfirmDelete(r.id)} title="Delete" className="p-2 rounded-lg bg-[#1E1E2E] border border-[#2E2E3E] hover:bg-red-900/30"><Trash2 className="w-4 h-4 text-red-400" /></button>
                            </>
                          )}
                        </div>
                      </td>
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
