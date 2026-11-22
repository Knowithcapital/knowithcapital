"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, ExternalLink, FileText, Trash2, Upload, X } from 'lucide-react';

type Client = { id: string; name: string | null; email: string; isActive: boolean };
type Report = {
  id: string; fileName: string; fileSize: number; reportDate: string | null; uploadedAt: string;
  client: { id: string; name: string | null; email: string };
};
type Pending = {
  key: string; file: File; email: string; reportDate: string;
  status: 'ready' | 'uploading' | 'done' | 'error'; note?: string;
};

const inputClass = 'bg-[#0A0A0F] border border-[#2E2E3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const label = (c: { name: string | null; email: string }) => (c.name ? `${c.name} — ${c.email}` : c.email);
const formatSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "…Report-16-Nov-2026.pdf" → "2026-11-16" (empty when the name has no date). */
function dateFromName(name: string): string {
  const m = /(\d{1,2})[\s._-]+([A-Za-z]{3})[A-Za-z]*[\s._-]+(\d{4})/.exec(name);
  if (m) {
    const mo = MONTHS.indexOf(m[2].toLowerCase());
    if (mo >= 0) return `${m[3]}-${String(mo + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const iso = /(\d{4})[-_.](\d{2})[-_.](\d{2})/.exec(name);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : '';
}

/** Pre-select the client when the file name contains their email, or every part of their name (only if exactly one client matches). */
function guessClient(fileName: string, clients: Client[]): string {
  const base = fileName.replace(/\.[^.]+$/, '').toLowerCase();
  const byEmail = clients.find(c => base.includes(c.email.toLowerCase()));
  if (byEmail) return byEmail.email;
  const words = new Set(base.split(/[^a-z0-9]+/).filter(Boolean));
  const matches = clients.filter(c => {
    const parts = (c.name ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(p => p.length >= 3);
    return parts.length >= 2 && parts.every(p => words.has(p));
  });
  return matches.length === 1 ? matches[0].email : '';
}

function ClientPicker({ clients, value, onChange }: { clients: Client[]; value: string; onChange: (email: string) => void }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const selected = clients.find(c => c.email === value);
  const results = useMemo(() => {
    const q = text.trim().toLowerCase();
    return (q ? clients.filter(c => `${c.name ?? ''} ${c.email}`.toLowerCase().includes(q)) : clients).slice(0, 8);
  }, [clients, text]);

  return (
    <div className="relative">
      <input
        className={`${inputClass} w-full`}
        placeholder="Search client by name or email"
        aria-label="Client"
        value={open ? text : selected ? label(selected) : text}
        onFocus={() => { setOpen(true); setText(''); }}
        onChange={e => { setText(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#2E2E3E] bg-[#111] shadow-xl">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No matching client</li>
          ) : results.map(c => (
            <li key={c.id}>
              <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-[#1E1E2E]" onMouseDown={() => { onChange(c.email); setOpen(false); }}>
                {label(c)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PortfolioReportsAdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [storage, setStorage] = useState<'cloudinary' | 'r2' | 'local' | 'none'>('r2');
  const [maxBytes, setMaxBytes] = useState(60 * 1024 * 1024);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadReports = async () => {
    const res = await fetch('/api/v1/admin/portfolio-reports');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Could not load reports');
    setReports(json.reports || []);
    setStorage(json.storage);
    if (json.maxBytes) setMaxBytes(json.maxBytes);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/v1/admin/portfolio-reports').then(async r => ({ ok: r.ok, json: await r.json() })),
      fetch('/api/v1/admin/clients').then(r => r.json()),
    ])
      .then(([rep, cl]) => {
        if (cancelled) return;
        if (rep.ok) { setReports(rep.json.reports || []); setStorage(rep.json.storage); if (rep.json.maxBytes) setMaxBytes(rep.json.maxBytes); }
        else setMessage({ ok: false, text: rep.json.error || 'Could not load reports' });
        setClients((cl.clients || []).filter((c: Client) => c.isActive));
      })
      .catch(e => { if (!cancelled) setMessage({ ok: false, text: (e as Error).message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const pickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next: Pending[] = [];
    for (const f of Array.from(files)) {
      if (!/\.pdf$/i.test(f.name)) { setMessage({ ok: false, text: `${f.name} is not a PDF and was skipped.` }); continue; }
      if (f.size > maxBytes) { setMessage({ ok: false, text: `${f.name} is ${formatSize(f.size)}, which is over the ${Math.round(maxBytes / 1024 / 1024)} MB limit of the current storage plan, so it was skipped. Compress the PDF and try again.` }); continue; }
      next.push({
        key: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
        file: f, email: guessClient(f.name, clients), reportDate: dateFromName(f.name), status: 'ready',
      });
    }
    setPending(p => [...p, ...next]);
  };

  const update = (key: string, patch: Partial<Pending>) => setPending(p => p.map(x => (x.key === key ? { ...x, ...patch } : x)));

  const uploadOne = async (item: Pending) => {
    // 1. ask for an upload link (R2) or learn that this is local development
    const start = await fetch('/api/v1/admin/portfolio-reports/upload-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: item.file.name, size: item.file.size }),
    });
    const startJson = await start.json().catch(() => ({}));
    if (!start.ok) throw new Error(startJson.error || 'Could not start the upload');

    if (startJson.mode === 'r2' || startJson.mode === 'cloudinary') {
      // 2. send the PDF straight to storage, 3. tell the website to attach it to the client
      if (startJson.mode === 'cloudinary') {
        const form = new FormData();
        for (const [k, v] of Object.entries(startJson.fields as Record<string, string>)) form.append(k, v);
        form.append('file', item.file);
        const up = await fetch(startJson.uploadUrl, { method: 'POST', body: form });
        if (!up.ok) {
          const out = await up.json().catch(() => ({}));
          throw new Error(out?.error?.message || `Upload to storage failed (${up.status})`);
        }
      } else {
        const put = await fetch(startJson.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: item.file });
        if (!put.ok) throw new Error(`Upload to storage failed (${put.status}). Check the bucket's CORS settings.`);
      }
      const res = await fetch('/api/v1/admin/portfolio-reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: item.email, key: startJson.key, fileName: item.file.name, reportDate: item.reportDate || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save the report');
      return json as { replaced: boolean };
    }

    const form = new FormData();
    form.append('email', item.email);
    form.append('file', item.file);
    form.append('reportDate', item.reportDate);
    const res = await fetch('/api/v1/admin/portfolio-reports', { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Could not save the report');
    return json as { replaced: boolean };
  };

  const uploadAll = async () => {
    setBusy(true);
    setMessage(null);
    let done = 0, failed = 0;
    for (const item of pending) {
      if (item.status === 'done') continue;
      if (!item.email) { update(item.key, { status: 'error', note: 'Choose a client' }); failed++; continue; }
      update(item.key, { status: 'uploading', note: undefined });
      try {
        const out = await uploadOne(item);
        update(item.key, { status: 'done', note: out.replaced ? 'Saved. The previous report was replaced and deleted' : 'Saved' });
        done++;
      } catch (e) {
        update(item.key, { status: 'error', note: (e as Error).message });
        failed++;
      }
    }
    setBusy(false);
    setMessage({ ok: failed === 0, text: `${done} report${done === 1 ? '' : 's'} saved${failed ? `, ${failed} need attention` : ''}.` });
    try { await loadReports(); } catch { /* the message above already tells the story */ }
  };

  const remove = async (id: string) => {
    await fetch(`/api/v1/admin/portfolio-reports/${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    try { await loadReports(); } catch (e) { setMessage({ ok: false, text: (e as Error).message }); }
  };

  const shown = query.trim()
    ? reports.filter(r => `${r.client.email} ${r.client.name ?? ''} ${r.fileName}`.toLowerCase().includes(query.trim().toLowerCase()))
    : reports;
  const waiting = pending.filter(p => p.status !== 'done').length;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Portfolio Reports</h1>
          <p className="text-gray-400 mt-2 text-sm max-w-2xl">
            Upload each client&apos;s monthly portfolio report as a PDF. After signing in with their email code, the client opens
            <b> My Portfolio</b> to view and download it. Each client has <b>one</b> report: uploading a new one replaces and deletes the previous file.
            Clients must be on the Client Access list first.
          </p>
        </div>

        {storage === 'none' && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <AlertCircle className="w-5 h-5 shrink-0" />
            Private file storage is not connected yet, so uploads are switched off. Connect Cloudinary (CLOUDINARY_URL) or Cloudflare R2 (R2_*) on the project to enable them.
          </div>
        )}

        {message && (
          <div className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${message.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
            {message.ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)} aria-label="Dismiss"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="p-5 rounded-2xl border border-[#2E2E3E] bg-[#0A0A0F] flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 ${storage === 'none' ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
              <Upload className="w-4 h-4" /> Choose PDF report(s)
              <input type="file" multiple accept="application/pdf,.pdf" className="hidden" disabled={storage === 'none'} onChange={e => { pickFiles(e.target.files); e.target.value = ''; }} />
            </label>
            <span className="text-xs text-gray-500">PDFs up to {Math.round(maxBytes / 1024 / 1024)} MB. You can choose several at once. The client and date are filled in from the file name when it contains them.</span>
          </div>

          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              {pending.map(p => (
                <div key={p.key} className="grid md:grid-cols-[1.2fr_1.4fr_9rem_auto] gap-2 items-start p-3 rounded-lg border border-[#2E2E3E] bg-[#111]">
                  <div className="text-sm truncate pt-2" title={p.file.name}><FileText className="inline w-4 h-4 mr-1 text-gray-500" />{p.file.name} <span className="text-gray-500">({formatSize(p.file.size)})</span></div>
                  <ClientPicker clients={clients} value={p.email} onChange={email => update(p.key, { email, status: 'ready', note: undefined })} />
                  <input type="date" value={p.reportDate} onChange={e => update(p.key, { reportDate: e.target.value })} className={inputClass} aria-label="Report date" />
                  <div className="flex items-center gap-2 text-xs min-w-[8rem] pt-2">
                    {p.status === 'uploading' && <span className="text-gray-400">Uploading…</span>}
                    {p.status === 'done' && <span className="text-emerald-400">{p.note}</span>}
                    {p.status === 'error' && <span className="text-red-400">{p.note}</span>}
                    {p.status !== 'uploading' && (
                      <button onClick={() => setPending(list => list.filter(x => x.key !== p.key))} aria-label="Remove from list" className="p-1.5 rounded bg-[#1E1E2E] border border-[#2E2E3E]"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <button onClick={() => setPending([])} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-[#1E1E2E] border border-[#2E2E3E]">Clear list</button>
                <button onClick={uploadAll} disabled={busy || waiting === 0} className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 disabled:opacity-50">
                  {busy ? 'Uploading…' : `Upload ${waiting} report${waiting === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#151515]/60 border border-[#2E2E3E]/50 rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input placeholder="Search by client name, email or file" value={query} onChange={e => setQuery(e.target.value)} className={`${inputClass} w-full max-w-sm`} />
            <span className="text-sm text-gray-400">{reports.length} of {clients.length} active clients have a report</span>
          </div>
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
                    <th className="px-4 py-3 font-medium">Report as on</th>
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(r => (
                    <tr key={r.id} className="border-b border-[#2E2E3E]/50 hover:bg-[#1E1E2E]/40">
                      <td className="px-4 py-3"><div className="text-white">{r.client.name || '—'}</div><div className="text-xs">{r.client.email}</div></td>
                      <td className="px-4 py-3">{r.reportDate ? formatDate(r.reportDate) : '—'}</td>
                      <td className="px-4 py-3"><div className="truncate max-w-xs" title={r.fileName}>{r.fileName}</div><div className="text-xs">{formatSize(r.fileSize)}</div></td>
                      <td className="px-4 py-3">{formatDate(r.uploadedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {confirmDelete === r.id ? (
                            <>
                              <button onClick={() => remove(r.id)} className="text-xs px-2 py-1 rounded bg-red-600 text-white">Delete file</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded bg-[#1E1E2E]">Cancel</button>
                            </>
                          ) : (
                            <>
                              <a href={`/api/v1/admin/portfolio-reports/${r.id}/file`} target="_blank" rel="noopener noreferrer" title="Open" className="p-2 rounded-lg bg-[#1E1E2E] border border-[#2E2E3E] hover:border-blue-500"><ExternalLink className="w-4 h-4" /></a>
                              <a href={`/api/v1/admin/portfolio-reports/${r.id}/file?download=1`} title="Download" className="p-2 rounded-lg bg-[#1E1E2E] border border-[#2E2E3E] hover:border-blue-500"><Download className="w-4 h-4" /></a>
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
