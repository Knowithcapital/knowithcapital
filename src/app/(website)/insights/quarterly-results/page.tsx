import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { loadSummary } from '@/lib/tracker/store';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quarterly Results Tracker | Knowith Capital',
  description: 'Results, bulk and block deals, monthly business numbers and market news for the current results season, each checked against a second source.',
};

export default async function ResultsTrackerPage() {
  const summary = await loadSummary();
  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.head}>
          <Link href="/insights" className={styles.back}>← All insights</Link>
          <div className="eyebrow">Market Intelligence</div>
          <h1 className={styles.title}>Quarterly Results Tracker</h1>
          <p className={styles.sub}>
            {summary
              ? <>{summary.season}. {summary.reported} companies tracked, {summary.checked} with figures verified against their NSE filing. Last updated {summary.updated_at.replace('T', ' ').replace(/\+05:30$/, '')} IST.</>
              : 'Results, deals, monthly business numbers and news for the current results season.'}
          </p>
        </div>
        {/* The page sandboxes itself through its response headers, so its scripts cannot reach this site or the visitor's session */}
        <iframe src="/api/v1/quarterly-results/frame" title="Quarterly Results Tracker" className={styles.frame} />
        <p className={styles.note}>
          For information only, based on company filings and public data; not a recommendation to buy or sell any security.
        </p>
      </main>
      <Footer />
    </>
  );
}
