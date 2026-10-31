"use client";

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Percent } from 'lucide-react';

/** Admin control for the risk-free rate used in the Sharpe ratios on the Indian market page. */
export default function RiskFreeRateSetting() {
  const [value, setValue] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [defaultPct, setDefaultPct] = useState(6.5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/admin/settings')
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        setValue(String(json.riskFreeRatePct ?? 6.5));
        setIsDefault(Boolean(json.isDefault));
        setDefaultPct(json.defaultPct ?? 6.5);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const save = async (next: number | null) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskFreeRatePct: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save');
      setValue(String(json.riskFreeRatePct));
      setIsDefault(next === null);
      setMessage({ ok: true, text: 'Saved. The Indian market page recalculates Sharpe ratios the next time its data refreshes (within a minute of the next visit).' });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#111118] border border-[#1F1F1F] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
        <Percent className="w-5 h-5 text-blue-400" />
        Risk-free rate (Indian market page)
      </h2>
      <p className="text-gray-400 text-sm max-w-2xl">
        Used in the Sharpe ratio: the fund&apos;s yearly return minus this rate, divided by its volatility. Update it when interest rates change
        (for example to the current 91-day T-bill yield). {isDefault ? `Currently using the default of ${defaultPct}%.` : ''}
      </p>
      <form
        className="mt-4 flex flex-wrap items-center gap-3"
        onSubmit={e => { e.preventDefault(); save(parseFloat(value)); }}
      >
        <div className="flex items-center gap-2">
          <input
            type="number" step="0.01" min="0" max="25" required
            value={value} onChange={e => setValue(e.target.value)}
            aria-label="Risk-free rate in percent per year"
            className="w-28 bg-[#0A0A0F] border border-[#2E2E3E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <span className="text-gray-400 text-sm">% per year</span>
        </div>
        <button disabled={busy} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium">
          Save
        </button>
        {!isDefault && (
          <button type="button" disabled={busy} onClick={() => save(null)} className="text-sm text-gray-400 hover:text-white underline">
            Reset to {defaultPct}%
          </button>
        )}
      </form>
      {message && (
        <div className={`mt-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${message.ok ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {message.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}
    </div>
  );
}
