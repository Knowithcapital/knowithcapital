"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './TrackerCard.module.css';

/**
 * Card on the Insights page that opens the Quarterly Results Tracker.
 * It reads a small summary from the database and hides itself until the tracker has data.
 */
export default function TrackerCard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/quarterly-results/summary')
      .then(res => (res.ok ? res.json() : { summary: null }))
      .then(json => { if (!cancelled) setSummary(json.summary ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!summary) return null;

  const updated = summary.updated_at
    ? new Date(summary.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const stats = [
    [summary.reported, 'companies tracked'],
    [summary.checked, 'verified with NSE filings'],
    [summary.totals?.deals, 'bulk and block deals'],
  ].filter(([n]) => typeof n === 'number' && n > 0);

  return (
    <section className={styles.wrap}>
      <div className="container">
        <Link href="/insights/quarterly-results" className={styles.card}>
          <div className={styles.text}>
            <span className={styles.eyebrow}>Live tracker{summary.season ? ` · ${summary.season}` : ''}</span>
            <h2 className={styles.title}>{summary.title || 'Quarterly Results Tracker'}</h2>
            <p className={styles.desc}>
              Every company&apos;s results this season, bulk and block deals, monthly business numbers and market news, each checked against a second source.
            </p>
            <span className={styles.cta}>Open the tracker &rarr;</span>
          </div>
          <div className={styles.stats}>
            {stats.map(([n, label]) => (
              <div key={label} className={styles.stat}>
                <strong>{n.toLocaleString('en-IN')}</strong>
                <span>{label}</span>
              </div>
            ))}
            {updated && <div className={styles.updated}>Updated {updated}</div>}
          </div>
        </Link>
      </div>
    </section>
  );
}
