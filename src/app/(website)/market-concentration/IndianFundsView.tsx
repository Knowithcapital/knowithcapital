'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '@/lib/products';
import DataTable, { type Column } from './DataTable';
import styles from './page.module.css';

// ── Types (mirror lib/services/indianMutualFunds) ───────────────

type Kind = 'mf' | 'etf';
type View = 'snapshot' | 'returns' | 'rolling' | 'portfolio' | 'risk' | 'details';
type RollWindow = '1y' | '3y' | '5y';
type RollPeriod = '3y' | '5y';
type Quartile = 1 | 2 | 3 | 4;
type ProductTab = Kind | ProductCategory;

interface Fund {
  schemeCode: string;
  name: string;
  amc: string;
  nav: number;
  returns: Partial<Record<'1m' | '3m' | '6m' | 'ytd' | '1y' | '3y' | '5y' | '10y', number>>;
  sip?: Partial<Record<'1y' | '3y' | '5y', number>>;
  rolling?: Partial<Record<RollWindow, Partial<Record<RollPeriod, RollingStats>>>>;
  risk?: { volatility?: number; maxDrawdown?: number; sharpe?: number; high52?: number; low52?: number; volatilityQuartile?: Quartile; sharpeQuartile?: Quartile };
  aumCr?: number;
  riskometer?: string;
  benchmark?: string;
  expenseRatio?: number;
  exitLoad?: string;
  minInvestment?: string;
  launchDate?: string;
  assetAllocation?: string;
  managers?: { name: string; since?: string }[];
}

interface RollingStats { avg: number; median: number; min: number; max: number; positivePct: number }

interface Report {
  riskFreeRatePct?: number;
  navDate: string;
  categories: { id: string; label: string; group: string; kind: Kind; count: number; funds: Fund[] }[];
  sources: string[];
}

// ── Formatting ──────────────────────────────────────────────────

const pct = (v?: number | null) => (v === undefined || v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`);
const fixed = (v: number | undefined | null, digits = 2, suffix = '') => (v === undefined || v === null ? '—' : `${v.toFixed(digits)}${suffix}`);
const nav = (v: number | undefined) => (v === undefined ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: 4 }));
const retColor = (v?: number | null) => (v === undefined || v === null ? 'var(--slate-soft)' : v >= 0 ? '#16a34a' : '#dc2626');
const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortDate = (iso?: string) =>
  iso ? new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : undefined;

function Ret({ v, bold }: { v?: number | null; bold?: boolean }) {
  return <span style={{ color: retColor(v), fontWeight: bold ? 700 : 500 }}>{pct(v)}</span>;
}

const RISK_COLORS: Record<string, string> = {
  low: '#16a34a', 'low to moderate': '#65a30d', moderate: '#ca8a04', 'moderately high': '#ea580c', high: '#dc2626', 'very high': '#b91c1c',
};

function RiskBadge({ level }: { level?: string }) {
  if (!level) return <>—</>;
  const color = RISK_COLORS[level.toLowerCase()] ?? 'var(--slate)';
  return <span className={styles.riskBadge} style={{ color, borderColor: color }}>{level}</span>;
}

const VOL_LABELS: Record<Quartile, string> = { 1: 'Lowest risk', 2: 'Below average', 3: 'Above average', 4: 'Highest risk' };
const SHARPE_LABELS: Record<Quartile, string> = { 1: 'Top quarter', 2: 'Upper middle', 3: 'Lower middle', 4: 'Bottom quarter' };
const QUARTILE_COLORS: Record<Quartile, string> = { 1: '#16a34a', 2: '#65a30d', 3: '#ea580c', 4: '#dc2626' };

/** Quarter 1 is always the good end (calmest for volatility, best for Sharpe), so green = good in both columns. */
function QuartileBadge({ q, labels }: { q?: Quartile; labels: Record<Quartile, string> }) {
  if (!q) return <>—</>;
  const color = QUARTILE_COLORS[q];
  return <span className={styles.riskBadge} style={{ color, borderColor: color }}>{labels[q]}</span>;
}

// ── Column sets for each tab ────────────────────────────────────

const fundColumn: Column<Fund> = {
  key: 'name',
  label: 'Fund',
  sticky: true,
  sortValue: f => f.name,
  render: (f, i) => (
    <div className={styles.fundCell}>
      <span className={styles.rankNum}>{i + 1}</span>
      <div>
        <div className={styles.fundName}>{f.name}</div>
        <div className={styles.fundMeta}>{f.amc}</div>
      </div>
    </div>
  ),
};

const ret = (key: keyof Fund['returns'], label: string, title?: string): Column<Fund> => ({
  key: `r${key}`, label, numeric: true, title, sortValue: f => f.returns[key], render: f => <Ret v={f.returns[key]} bold={key === '1y'} />,
});

const sip = (key: keyof NonNullable<Fund['sip']>, label: string): Column<Fund> => ({
  key: `s${key}`, label, numeric: true, title: `Annualised return (XIRR) of a monthly SIP over ${key.replace('y', ' year')}s`,
  sortValue: f => f.sip?.[key], render: f => <Ret v={f.sip?.[key]} />,
});

const aumColumn: Column<Fund> = {
  key: 'aum', label: 'AUM (₹ Cr)', numeric: true, sortValue: f => f.aumCr, render: f => f.aumCr?.toLocaleString('en-IN') ?? '—',
};

const riskometerColumn: Column<Fund> = {
  key: 'riskometer', label: 'Riskometer', sortValue: f => f.riskometer, render: f => <RiskBadge level={f.riskometer} />,
};

function columnsFor(view: View, rolling: { window: RollWindow; period: RollPeriod }): Column<Fund>[] {
  switch (view) {
    case 'snapshot':
      return [
        fundColumn,
        ret('1y', '1Y Return', 'Point-to-point absolute return'),
        ret('3y', '3Y CAGR'),
        ret('5y', '5Y CAGR'),
        aumColumn,
        { key: 'nav', label: 'NAV (₹)', numeric: true, sortValue: f => f.nav, render: f => nav(f.nav) },
        riskometerColumn,
      ];
    case 'returns':
      return [
        fundColumn,
        ret('1m', '1M'), ret('3m', '3M'), ret('6m', '6M'), ret('ytd', 'YTD'), ret('1y', '1Y'),
        ret('3y', '3Y CAGR'), ret('5y', '5Y CAGR'), ret('10y', '10Y CAGR'),
        sip('1y', 'SIP 1Y'), sip('3y', 'SIP 3Y'), sip('5y', 'SIP 5Y'),
      ];
    case 'rolling': {
      const stat = (f: Fund) => f.rolling?.[rolling.window]?.[rolling.period];
      return [
        fundColumn,
        { key: 'ravg', label: 'Average', numeric: true, title: 'Average return across all windows', sortValue: f => stat(f)?.avg, render: f => <Ret v={stat(f)?.avg} bold /> },
        { key: 'rmed', label: 'Median', numeric: true, title: 'Middle value: half the windows did better, half worse', sortValue: f => stat(f)?.median, render: f => <Ret v={stat(f)?.median} /> },
        { key: 'rmin', label: 'Worst', numeric: true, title: 'Lowest return in any window', sortValue: f => stat(f)?.min, render: f => <Ret v={stat(f)?.min} /> },
        { key: 'rmax', label: 'Best', numeric: true, title: 'Highest return in any window', sortValue: f => stat(f)?.max, render: f => <Ret v={stat(f)?.max} /> },
        { key: 'rpos', label: 'Times positive', numeric: true, title: 'Share of windows with a positive return', sortValue: f => stat(f)?.positivePct, render: f => (stat(f) ? `${stat(f)!.positivePct.toFixed(1)}%` : '—') },
      ];
    }
    case 'portfolio':
      return [
        fundColumn,
        aumColumn,
        { key: 'benchmark', label: 'Benchmark', sortValue: f => f.benchmark, render: f => f.benchmark ?? '—' },
        {
          key: 'alloc', label: 'Asset allocation mandate', title: 'Allowed asset mix as stated in the scheme document',
          render: f => <span className={styles.wrapCell}>{f.assetAllocation ?? '—'}</span>,
        },
        riskometerColumn,
      ];
    case 'risk':
      return [
        fundColumn,
        riskometerColumn,
        {
          key: 'riskq', label: 'Risk vs category', title: 'Where this fund\'s volatility sits among funds in the same category (quarters)',
          sortValue: f => f.risk?.volatilityQuartile, render: f => <QuartileBadge q={f.risk?.volatilityQuartile} labels={VOL_LABELS} />,
        },
        { key: 'vol', label: 'Volatility (3Y)', numeric: true, title: 'Annualised standard deviation of daily NAV returns', sortValue: f => f.risk?.volatility, render: f => fixed(f.risk?.volatility, 2, '%') },
        { key: 'dd', label: 'Max drawdown (3Y)', numeric: true, title: 'Largest peak-to-trough fall in NAV', sortValue: f => f.risk?.maxDrawdown, render: f => <span style={{ color: retColor(f.risk?.maxDrawdown) }}>{fixed(f.risk?.maxDrawdown, 2, '%')}</span> },
        { key: 'sharpe', label: 'Sharpe (3Y)', numeric: true, title: 'Excess return over the risk-free rate, per unit of volatility', sortValue: f => f.risk?.sharpe, render: f => fixed(f.risk?.sharpe) },
        {
          key: 'sharpeq', label: 'Return for risk', title: 'Where this fund\'s Sharpe ratio sits among funds in the same category (quarters)',
          sortValue: f => f.risk?.sharpeQuartile, render: f => <QuartileBadge q={f.risk?.sharpeQuartile} labels={SHARPE_LABELS} />,
        },
        { key: 'hi', label: '52W high (₹)', numeric: true, sortValue: f => f.risk?.high52, render: f => nav(f.risk?.high52) },
        { key: 'lo', label: '52W low (₹)', numeric: true, sortValue: f => f.risk?.low52, render: f => nav(f.risk?.low52) },
      ];
    case 'details':
      return [
        fundColumn,
        {
          key: 'mgr', label: 'Fund manager', sortValue: f => f.managers?.[0]?.name,
          render: f => f.managers?.length ? (
            <div className={styles.mgrList}>
              {f.managers.map(m => (
                <div key={m.name}>{m.name}{m.since ? <span className={styles.fundMeta}> · since {shortDate(m.since)}</span> : null}</div>
              ))}
            </div>
          ) : '—',
        },
        { key: 'ter', label: 'Expense ratio', numeric: true, title: 'Total expense ratio (TER) of the Regular plan', sortValue: f => f.expenseRatio, render: f => fixed(f.expenseRatio, 2, '%') },
        { key: 'exit', label: 'Exit load', render: f => <span className={styles.wrapCell}>{f.exitLoad ?? '—'}</span> },
        { key: 'min', label: 'Min. investment', sortValue: f => f.minInvestment, render: f => f.minInvestment ?? '—' },
        { key: 'launch', label: 'Launched', sortValue: f => f.launchDate, render: f => shortDate(f.launchDate) ?? '—' },
        aumColumn,
      ];
  }
}

const VIEWS: { id: View; label: string }[] = [
  { id: 'snapshot', label: 'Snapshot' },
  { id: 'returns', label: 'Returns' },
  { id: 'rolling', label: 'Rolling' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'risk', label: 'Risk' },
  { id: 'details', label: 'Details' },
];

const DEFAULT_SORT: Record<View, { key: string; dir: 'asc' | 'desc' }> = {
  snapshot: { key: 'r1y', dir: 'desc' },
  returns: { key: 'r1y', dir: 'desc' },
  rolling: { key: 'ravg', dir: 'desc' },
  portfolio: { key: 'aum', dir: 'desc' },
  risk: { key: 'sharpe', dir: 'desc' },
  details: { key: 'aum', dir: 'desc' },
};

const VIEW_NOTES: Record<View, string> = {
  snapshot: '1Y is the point-to-point absolute return; 3Y and 5Y are annualised (CAGR), measured from the latest NAV on or before the same date in the earlier year. “—” means the fund is younger than that period.',
  returns: 'Periods up to 1 year (1M, 3M, 6M, YTD, 1Y) are absolute returns; 3Y, 5Y and 10Y are CAGR. SIP columns show the annualised return (XIRR) of equal monthly instalments redeemed at the latest NAV.',
  rolling: 'Rolling returns show how consistent a fund has been: take every possible start date, hold for the chosen window, and look at the spread of results. Windows longer than a year are annualised (CAGR). A fund needs history covering the look-back period plus the window, otherwise it shows “—”.',
  portfolio: 'Holdings and sector weights are not available from the free data sources used here. The mandate is the asset mix the scheme document permits; the benchmark is the index the fund is measured against.',
  risk: 'Computed from daily NAVs over the last 3 years (funds with a shorter track record show “—”). Volatility is the annualised standard deviation of daily returns; max drawdown is the largest peak-to-trough fall; Sharpe uses the risk-free rate shown below. “Risk vs category” and “Return for risk” rank each fund against the others in its category in quarters. The riskometer is the SEBI-mandated label.',
  details: 'Manager names and tenure, expense ratio (Regular plan), exit load and minimum investment come from scheme filings and may be out of date — check the scheme document before investing.',
};

// ── Data loading (cached for the session so switching tabs is instant) ──

const reportCache = new Map<Kind, Promise<Report | null>>();

function loadReport(kind: Kind): Promise<Report | null> {
  let p = reportCache.get(kind);
  if (!p) {
    p = fetch(`/api/v1/market-data/india?kind=${kind}`)
      .then(res => res.json())
      .then(json => (json.data as Report | null) ?? null)
      .catch(() => null);
    reportCache.set(kind, p);
    p.then(r => { if (!r) reportCache.delete(kind); }); // don't cache failures
  }
  return p;
}

// ── Mutual funds & ETFs ─────────────────────────────────────────

function FundsExplorer({ kind }: { kind: Kind }) {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [view, setView] = useState<View>('snapshot');
  const [rollWindow, setRollWindow] = useState<RollWindow>('1y');
  const [rollPeriod, setRollPeriod] = useState<RollPeriod>('5y');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadReport(kind).then(r => {
      if (cancelled) return;
      setReport(r);
      setCategoryId(r?.categories[0]?.id ?? null);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [kind]);

  const category = report?.categories.find(c => c.id === categoryId);
  const columns = useMemo(() => columnsFor(view, { window: rollWindow, period: rollPeriod }), [view, rollWindow, rollPeriod]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const funds = category?.funds ?? [];
    return q ? funds.filter(f => f.name.toLowerCase().includes(q) || f.amc.toLowerCase().includes(q)) : funds;
  }, [category, query]);

  if (isLoading) return <div className={styles.loading}>Fetching the latest NAVs from AMFI…</div>;
  if (!report) return <div className={styles.error}>Fund data is temporarily unavailable. Please check back shortly.</div>;

  const noun = kind === 'etf' ? 'ETFs' : 'funds';

  return (
    <>
      <div className={styles.metaRow} style={{ marginBottom: '1rem' }}>
        <div className={styles.badge}>NAV as of {formatDate(report.navDate)}</div>
        <span className={styles.metaNote}>* Updated once every day</span>
      </div>

      <div className={styles.categoryTabs} role="tablist" aria-label={kind === 'etf' ? 'ETF category' : 'Fund category'}>
        {report.categories.map(c => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === categoryId}
            className={`${styles.categoryTab} ${c.id === categoryId ? styles.categoryTabActive : ''}`}
            onClick={() => { setCategoryId(c.id); setQuery(''); }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.viewTabs} role="tablist" aria-label="Table view">
          {VIEWS.map(v => (
            <button key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? styles.viewTabActive : ''} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <Search className={styles.searchIcon} aria-hidden />
          <input
            type="search"
            placeholder={`Search ${noun} or AMC`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label={`Search ${noun}`}
          />
        </label>
      </div>

      {view === 'rolling' && (
        <div className={styles.rollingControls}>
          <label>
            Window
            <select value={rollWindow} onChange={e => setRollWindow(e.target.value as RollWindow)} className={styles.select}>
              <option value="1y">1 year</option>
              <option value="3y">3 years</option>
              <option value="5y">5 years</option>
            </select>
          </label>
          <label>
            Over the last
            <select value={rollPeriod} onChange={e => setRollPeriod(e.target.value as RollPeriod)} className={styles.select}>
              <option value="3y">3 years</option>
              <option value="5y">5 years</option>
            </select>
          </label>
          <span className={styles.metaNote}>Every {rollWindow.replace('y', '-year')} window that ended in the last {rollPeriod.replace('y', ' years')}</span>
        </div>
      )}

      {category && (
        <p className={styles.categoryLine}>
          {category.label} · {category.count} {noun} tracked · {kind === 'mf' ? 'Regular plan · Growth option' : 'NAV-based returns'} · click a column heading to sort
        </p>
      )}

      <DataTable
        key={`${kind}-${categoryId}-${view}-${rollWindow}-${rollPeriod}`}
        rows={rows}
        columns={columns}
        getKey={f => f.schemeCode}
        defaultSort={DEFAULT_SORT[view]}
        noun={noun}
        emptyText={query ? `No ${noun} match “${query}”.` : `No ${noun} in this category.`}
      />

      <div className={styles.footer}>
        <p>Source: {report.sources.join(' · ')}.</p>
        <p>
          {VIEW_NOTES[view]}
          {view === 'risk' && report.riskFreeRatePct !== undefined ? ` Risk-free rate used: ${report.riskFreeRatePct}%.` : ''}
          {kind === 'etf' ? ' ETF figures are based on the fund’s NAV, not its exchange traded price, and ETFs whose units were split or consolidated show returns only where the NAV series is comparable.' : ''}
        </p>
        <p>Mutual fund investments are subject to market risks; read all scheme-related documents carefully. Past performance is not indicative of future returns.</p>
      </div>
    </>
  );
}

// ── SIF / Gift City / PMS (curated lists) ───────────────────────

const productColumns: Column<Product>[] = [
  {
    key: 'name', label: 'Name', sticky: true, sortValue: p => p.name,
    render: (p, i) => (
      <div className={styles.fundCell}>
        <span className={styles.rankNum}>{i + 1}</span>
        <div>
          <div className={styles.fundName}>{p.name}</div>
          {p.provider && <div className={styles.fundMeta}>{p.provider}</div>}
        </div>
      </div>
    ),
  },
  { key: 'strategy', label: 'Strategy', sortValue: p => p.strategy, render: p => p.strategy ?? '—' },
  { key: 'min', label: 'Min. investment', sortValue: p => p.minInvestment, render: p => p.minInvestment ?? '—' },
  { key: 'r1', label: '1Y Return', numeric: true, sortValue: p => p.return1y, render: p => <Ret v={p.return1y} bold /> },
  { key: 'r3', label: '3Y Return', numeric: true, sortValue: p => p.return3y, render: p => <Ret v={p.return3y} /> },
  { key: 'r5', label: '5Y Return', numeric: true, sortValue: p => p.return5y, render: p => <Ret v={p.return5y} /> },
  { key: 'aum', label: 'AUM', numeric: true, sortValue: p => p.aum, render: p => p.aum ?? '—' },
  { key: 'fees', label: 'Fees', render: p => <span className={styles.wrapCell}>{p.fees ?? '—'}</span> },
  {
    key: 'notes', label: 'Notes',
    render: p => (
      <span className={styles.wrapCell}>
        {p.notes}
        {p.url && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className={styles.extLink} aria-label={`More about ${p.name}`}>
            <ExternalLink className={styles.sortIcon} />
          </a>
        )}
        {!p.notes && !p.url && '—'}
      </span>
    ),
  },
];

function ProductCatalog({ category }: { category: ProductCategory }) {
  const [state, setState] = useState<{ category: ProductCategory; products: Product[] | null } | null>(null);
  const meta = PRODUCT_CATEGORIES.find(c => c.id === category)!;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/products?category=${category}`)
      .then(res => res.json())
      .then(json => { if (!cancelled) setState({ category, products: json.products ?? [] }); })
      .catch(() => { if (!cancelled) setState({ category, products: [] }); });
    return () => { cancelled = true; };
  }, [category]);

  const products = state?.category === category ? state.products : null;
  if (products === null) return <div className={styles.loading}>Loading {meta.full}…</div>;

  if (products.length === 0) {
    return (
      <div className={styles.emptyCard}>
        <h3>{meta.full}</h3>
        <p>We are curating this list. Speak to us for the current {meta.label} options that suit your profile.</p>
        <Link href="/contact" className={styles.emptyCta}>Book a consultation →</Link>
      </div>
    );
  }

  return (
    <>
      <p className={styles.categoryLine}>{meta.full} · {products.length} listed · click a column heading to sort</p>
      <DataTable
        key={category}
        rows={products}
        columns={productColumns}
        getKey={p => p.id}
        defaultSort={{ key: 'r1', dir: 'desc' }}
        noun="products"
        emptyText="No products listed."
      />
      <div className={styles.footer}>
        <p>Details are curated by Knowith Capital from provider disclosures and are updated periodically. Returns, where shown, are as reported by the provider and may not be audited.</p>
        <p>
          {category === 'PMS' && 'Portfolio Management Services carry market risk and are suitable only for eligible investors; returns are not guaranteed. '}
          {category === 'SIF' && 'Specialized Investment Funds are a new product category with a higher minimum investment; read the scheme documents carefully. '}
          {category === 'GIFT_CITY' && 'Gift City (IFSC) products are denominated in foreign currency and are subject to the Liberalised Remittance Scheme and tax rules; seek advice before investing. '}
          Past performance is not indicative of future returns.
        </p>
      </div>
    </>
  );
}

// ── Page section ────────────────────────────────────────────────

const PRODUCT_TABS: { id: ProductTab; label: string }[] = [
  { id: 'mf', label: 'Mutual Funds' },
  { id: 'etf', label: 'ETFs' },
  ...PRODUCT_CATEGORIES.map(c => ({ id: c.id as ProductTab, label: c.label })),
];

const HEADINGS: Record<ProductTab, { title: string; subtitle: string }> = {
  mf: { title: 'Top Performing Mutual Funds', subtitle: 'Every open-ended Regular-plan fund in each category, ranked on NAV returns published by AMFI.' },
  etf: { title: 'Exchange Traded Funds', subtitle: 'Equity, gold, silver, debt and international ETFs with NAV-based returns published by AMFI.' },
  SIF: { title: 'Specialized Investment Funds', subtitle: 'A curated look at SIF strategies, which sit between mutual funds and PMS.' },
  GIFT_CITY: { title: 'Gift City Funds', subtitle: 'Curated funds from the GIFT City (IFSC) for global diversification.' },
  PMS: { title: 'Portfolio Management Services', subtitle: 'A curated look at PMS strategies for eligible investors.' },
};

const isTab = (v: string | null): v is ProductTab => PRODUCT_TABS.some(t => t.id === v);

/** `initialProduct` is the ?product= value from the URL so a shared link opens the right tab. */
export default function IndianFundsView({ initialProduct }: { initialProduct?: string | null }) {
  const [tab, setTab] = useState<ProductTab>(isTab(initialProduct ?? null) ? (initialProduct as ProductTab) : 'mf');

  const select = (t: ProductTab) => {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === 'mf') url.searchParams.delete('product');
    else url.searchParams.set('product', t);
    window.history.replaceState(null, '', url);
  };

  return (
    <>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Indian Market</span>
        <h1 className={styles.title}>{HEADINGS[tab].title}</h1>
        <p className={styles.subtitle}>{HEADINGS[tab].subtitle}</p>
      </div>

      <div className={styles.productTabs} role="tablist" aria-label="Product type">
        {PRODUCT_TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? styles.productTabActive : ''} onClick={() => select(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mf' || tab === 'etf' ? <FundsExplorer key={tab} kind={tab} /> : <ProductCatalog category={tab} />}
    </>
  );
}
