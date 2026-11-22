// ────────────────────────────────────────────────────────────────
// Quarterly Results Tracker — merge and build rules.
//
// A TypeScript port of the original build.py, so the website applies exactly the same rules:
//   • an update file {results, deals, monthly, events, xposts, meta, quarter_notes} is merged into the
//     library; an item whose key matches an existing one replaces it
//   • every item with an independent second source (src2) is marked "double checked" (dc = ok),
//     the rest "pending"
//   • sector aggregates and a factual narrative are recomputed for the current quarter on every
//     update; earlier quarters are kept as they were
//   • results of every quarter are kept; deals, events and X posts keep the latest 60 days
//
// On top of build.py this adds input checks (types, lengths, http(s)-only links) because the
// update file now arrives through the admin panel.
//
// No imports on purpose: pure functions, easy to test.
// ────────────────────────────────────────────────────────────────

export const SECTIONS = ['results', 'deals', 'monthly', 'events', 'xposts'] as const;
export type Section = (typeof SECTIONS)[number];

export interface Src { url?: string; name?: string }
export interface Item { date?: string; src?: string; src_name?: string; src2?: Src; dc?: 'ok' | 'pending'; [k: string]: unknown }
export interface QuarterSummary {
  quarter: string;
  season?: string;
  computed_at?: string;
  overall?: Aggregate;
  sectors?: (Aggregate & { sector: string })[];
  narrative?: string[];
  notes?: string[];
  final?: boolean;
}
export interface Library {
  meta: Record<string, unknown> & { quarter?: string; season?: string; updated_at?: string };
  results: Item[];
  deals: Item[];
  monthly: Item[];
  events: Item[];
  xposts: Item[];
  quarters: Record<string, QuarterSummary>;
}
export interface Aggregate {
  reported: number; checked: number; profit_grew: number; profit_comparable: number;
  rev_grew: number; rev_comparable: number; median_pat: number | null; median_rev: number | null;
  back_to_profit: number; swung_to_loss: number; loss_both: number;
}
export interface UpdateInput {
  results?: unknown[]; deals?: unknown[]; monthly?: unknown[]; events?: unknown[]; xposts?: unknown[];
  meta?: Record<string, unknown>; quarter_notes?: Record<string, unknown>;
}
export interface UpdateOutcome {
  library: Library;
  added: Record<Section, number>;
  replaced: Record<Section, number>;
  skipped: { section: Section; reason: string; sample: string }[];
}

const REQUIRED: Record<Section, string[]> = {
  results: ['name', 'date', 'quarter', 'pat_status', 'sector', 'src', 'src_name'],
  deals: ['stock', 'client', 'exchange', 'type', 'action', 'date', 'price', 'qty', 'pct', 'src', 'src_name'],
  monthly: ['company', 'period', 'metric', 'value', 'src', 'src_name'],
  events: ['date', 'company', 'type', 'text', 'src_name'],
  xposts: ['date', 'company', 'handle', 'text'],
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');
/** Rounds to one decimal the way the original Python did (exact binary value, so 17.95 → 17.9). */
const round1 = (n: number) => Number(n.toFixed(1));
/** Whole-number rounding with ties to even, like Python's round(). */
const roundInt = (n: number) => { const f = Math.floor(n), d = n - f; return d < 0.5 ? f : d > 0.5 ? f + 1 : f % 2 === 0 ? f : f + 1; };
const lower = (v: unknown) => str(v).toLowerCase();

const KEYS: Record<Section, (x: Item) => string> = {
  results: x => [lower(x.name), str(x.quarter)].join('|'),
  deals: x => [lower(x.stock), lower(x.client), str(x.date), str(x.action), str(x.type)].join('|'),
  monthly: x => [lower(x.company), str(x.period), str(x.metric)].join('|'),
  events: x => [lower(x.company), str(x.date), str(x.text).slice(0, 60)].join('|'),
  xposts: x => [str(x.url) || str(x.text).slice(0, 60), lower(x.company)].join('|'),
};

const MAX_TEXT = 4000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const METAKEYS = ['title', 'updated_at', 'season', 'deadline', 'coverage_note', 'quarter'];

/** Only http(s) links survive; anything else (javascript:, data:, relative) is dropped. */
function cleanUrl(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (s.length > 1000) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function cleanSrc(v: unknown): Src | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const url = cleanUrl((v as Src).url);
  if (!url) return undefined;
  return { url, name: str((v as Src).name).slice(0, 200) };
}

/**
 * Validates one incoming item: required fields present, strings capped, numbers finite,
 * dates ISO, links http(s). Returns the cleaned item, or a reason for rejecting it.
 */
function cleanItem(section: Section, raw: unknown): { item: Item } | { reason: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { reason: 'not an object' };
  const x: Item = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') x[k] = v.length > MAX_TEXT ? v.slice(0, MAX_TEXT) : v;
    else if (typeof v === 'number') { if (Number.isFinite(v)) x[k] = v; }
    else if (typeof v === 'boolean' || v === null) x[k] = v;
    else if (k === 'src2' || k === 'src2_prev' || k === 'note_src2') x[k] = v;   // cleaned below
  }
  for (const f of REQUIRED[section]) {
    if (x[f] === undefined || x[f] === null || x[f] === '') return { reason: `missing ${f}` };
  }
  if (typeof x.date === 'string' && !ISO_DATE.test(x.date)) return { reason: 'date is not YYYY-MM-DD' };

  for (const f of ['src', 'url'] as const) {
    if (x[f] !== undefined) {
      const u = cleanUrl(x[f]);
      if (!u) { if (f === 'src' && REQUIRED[section].includes('src')) return { reason: 'src is not an http(s) link' }; delete x[f]; }
      else x[f] = u;
    }
  }
  for (const f of ['src2', 'src2_prev', 'note_src2'] as const) {
    if (f in x) { const c = cleanSrc(x[f]); if (c) x[f] = c; else delete x[f]; }
  }
  if (section === 'deals') {
    const price = Number(x.price), qty = Number(x.qty);
    if (!Number.isFinite(price) || !Number.isFinite(qty)) return { reason: 'price or qty is not a number' };
    if (x.value_cr === undefined) x.value_cr = round1((price * qty) / 1e7);
  }
  return { item: x };
}

// ── double check, aggregates, narrative ─────────────────────────

/** An item is "double checked" when it has a second source that differs from the first. */
export function setDoubleCheck(lib: Library) {
  for (const sec of ['results', 'deals', 'monthly', 'events'] as const) {
    for (const x of lib[sec]) {
      const s2 = x.src2;
      x.dc = s2?.url && s2.url !== x.src ? 'ok' : 'pending';
      if (sec === 'results' && typeof x.note === 'string' && x.note) {
        if (/\d/.test(x.note)) {
          const n2 = x.note_src2 as Src | undefined;
          x.note_dc = n2?.url ? 'ok' : 'pending';
        } else {
          delete x.note_dc;
        }
      }
    }
  }
}

function median(values: (number | null | undefined)[]): number | null {
  const v = values.filter((n): n is number => typeof n === 'number').sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = v.length >> 1;
  const m = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  return round1(m);
}

/** Counts and medians over results verified against an NSE filing (src2 name starts with "NSE"). */
export function aggregate(rows: Item[]): Aggregate {
  const status = (r: Item) => str(r.pat_status);
  const checked = rows.filter(r => str((r.src2 as Src | undefined)?.name).toUpperCase().startsWith('NSE'));
  const comparable = checked.filter(r => ['Grew', 'Fell', 'Swung to loss'].includes(status(r)));
  const revs = checked.map(r => r.rev_yoy).filter((v): v is number => typeof v === 'number');
  return {
    reported: rows.length,
    checked: checked.length,
    profit_grew: comparable.filter(r => status(r) === 'Grew').length,
    profit_comparable: comparable.length,
    rev_grew: revs.filter(v => v > 0).length,
    rev_comparable: revs.length,
    median_pat: median(comparable.map(r => r.pat_yoy as number | null | undefined)),
    median_rev: median(revs),
    back_to_profit: checked.filter(r => status(r) === 'Back to profit').length,
    swung_to_loss: checked.filter(r => status(r) === 'Swung to loss').length,
    loss_both: checked.filter(r => ['Loss both years', 'Loss narrowed'].includes(status(r))).length,
  };
}

function narrative(q: string, ov: Aggregate, sectors: (Aggregate & { sector: string })[], prev?: QuarterSummary): string[] {
  const pc = (a: number, b: number) => (b ? `${roundInt((a / b) * 100)}%` : '—');
  const sg = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);
  const lines = [
    `${q}: ${ov.reported} companies tracked; ${ov.checked} have figures verified with their consolidated NSE filing (the aggregates below use only these).`,
    `Profit grew year on year at ${ov.profit_grew} of ${ov.profit_comparable} companies with a year-ago profit (${pc(ov.profit_grew, ov.profit_comparable)}); revenue grew at ${ov.rev_grew} of ${ov.rev_comparable} (${pc(ov.rev_grew, ov.rev_comparable)}).`,
    `Median profit growth ${sg(ov.median_pat)}; median revenue growth ${sg(ov.median_rev)}. ${ov.back_to_profit} returned to profit, ${ov.swung_to_loss} swung to a loss, ${ov.loss_both} had a loss in both years.`,
  ];
  const big = sectors.filter(s => s.profit_comparable >= 4 && s.median_pat !== null);
  if (big.length) {
    const hi = [...big].sort((a, b) => b.median_pat! - a.median_pat!).slice(0, 3);
    const lo = [...big].sort((a, b) => a.median_pat! - b.median_pat!).slice(0, 3);
    lines.push(`Highest median profit growth (sectors with 4+ comparable companies): ${hi.map(s => `${s.sector} ${sg(s.median_pat)}`).join(', ')}.`);
    lines.push(`Lowest: ${lo.map(s => `${s.sector} ${sg(s.median_pat)}`).join(', ')}.`);
  }
  if (prev?.overall) {
    const po = prev.overall;
    lines.push(`Previous season (${prev.quarter}): profit grew at ${pc(po.profit_grew, po.profit_comparable)} of companies; median profit growth ${sg(po.median_pat)}, median revenue growth ${sg(po.median_rev)}.`);
  }
  return lines;
}

/** "Q2 FY27" → [27, 2] so quarters sort in time order. */
function quarterOrder(q: string): [number, number] {
  const m = /^Q(\d)\s+FY(\d{2})$/.exec(q.trim());
  return m ? [Number(m[2]), Number(m[1])] : [0, 0];
}
const before = (a: string, b: string) => {
  const [ya, qa] = quarterOrder(a), [yb, qb] = quarterOrder(b);
  return ya < yb || (ya === yb && qa < qb);
};

/** Recomputes the current quarter's summary; earlier quarters stay exactly as they were. */
export function buildQuarters(lib: Library, now: Date) {
  const cur = lib.meta.quarter;
  if (!cur) return;
  const rows = lib.results.filter(r => r.quarter === cur);
  const bySector = new Map<string, Item[]>();
  for (const r of rows) bySector.set(str(r.sector), [...(bySector.get(str(r.sector)) ?? []), r]);
  const sectors = [...bySector].map(([sector, rr]) => ({ ...aggregate(rr), sector }))
    .sort((a, b) => b.reported - a.reported || a.sector.localeCompare(b.sector));
  const overall = aggregate(rows);
  const earlier = Object.keys(lib.quarters).filter(k => before(k, cur)).sort((a, b) => (before(a, b) ? -1 : 1));
  const prev = earlier.length ? lib.quarters[earlier[earlier.length - 1]] : undefined;
  const old = lib.quarters[cur];
  lib.quarters[cur] = {
    quarter: cur,
    season: str(lib.meta.season) || cur,
    computed_at: istStamp(now),
    overall,
    sectors,
    narrative: narrative(cur, overall, sectors, prev),
    notes: old?.notes ?? [],          // hand-written factual notes survive every update
    final: old?.final ?? false,
  };
}

/** "2026-11-22T13:56+05:30" in India time, like the original. */
function istStamp(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return `${ist.toISOString().slice(0, 16)}+05:30`;
}

const RETENTION_DAYS = 60;

/** Retention, double-check flags, quarter summary and timestamp. Run after every change. */
export function finalize(lib: Library, now: Date = new Date()): Library {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86400_000).toISOString().slice(0, 10);
  for (const sec of ['deals', 'events', 'xposts'] as const) {
    lib[sec] = lib[sec].filter(x => str(x.date) >= cutoff);
  }
  setDoubleCheck(lib);
  buildQuarters(lib, now);
  lib.meta.updated_at = istStamp(now);
  return lib;
}

export function emptyLibrary(): Library {
  return { meta: {}, results: [], deals: [], monthly: [], events: [], xposts: [], quarters: {} };
}

const zero = (): Record<Section, number> => ({ results: 0, deals: 0, monthly: 0, events: 0, xposts: 0 });

/**
 * Merges an update into a library (does not mutate the original). Items whose key matches an
 * existing one replace it; everything else is kept.
 */
export function applyUpdate(base: Library, input: UpdateInput, opts: { now?: Date } = {}): UpdateOutcome {
  const lib: Library = JSON.parse(JSON.stringify(base));
  const added = zero(), replaced = zero();
  const skipped: UpdateOutcome['skipped'] = [];

  for (const sec of SECTIONS) {
    const current = new Map<string, Item>(lib[sec].map(x => [KEYS[sec](x), x]));
    for (const raw of (Array.isArray(input[sec]) ? input[sec]! : [])) {
      const cleaned = cleanItem(sec, raw);
      if ('reason' in cleaned) { skipped.push({ section: sec, reason: cleaned.reason, sample: JSON.stringify(raw ?? null).slice(0, 80) }); continue; }
      const key = KEYS[sec](cleaned.item);
      if (current.has(key)) replaced[sec]++; else added[sec]++;
      current.set(key, cleaned.item);
    }
    lib[sec] = [...current.values()];
  }

  if (input.meta && typeof input.meta === 'object') {
    for (const k of METAKEYS) {
      const v = input.meta[k];
      if (typeof v === 'string') lib.meta[k] = v.slice(0, 1000);
    }
  }
  if (input.quarter_notes && typeof input.quarter_notes === 'object') {
    for (const [q, notes] of Object.entries(input.quarter_notes)) {
      if (!/^Q\d\s+FY\d{2}$/.test(q) || !Array.isArray(notes)) continue;
      const entry = (lib.quarters[q] ??= { quarter: q });
      entry.notes = [...(entry.notes ?? []), ...notes.filter((n): n is string => typeof n === 'string').map(n => n.slice(0, 1000))];
    }
  }
  return { library: finalize(lib, opts.now), added, replaced, skipped };
}

/**
 * Turns a whole library.json into a library: every item is validated, the quarter archive is kept
 * (it holds earlier seasons that cannot be recomputed), and the standard rules are applied.
 */
export function libraryFromJson(input: unknown, opts: { now?: Date } = {}): UpdateOutcome {
  if (!input || typeof input !== 'object') throw new Error('The file is not a library.json (expected an object)');
  const raw = input as Partial<Library> & UpdateInput;
  const base = emptyLibrary();
  if (raw.quarters && typeof raw.quarters === 'object') {
    for (const [q, v] of Object.entries(raw.quarters)) {
      if (/^Q\d\s+FY\d{2}$/.test(q) && v && typeof v === 'object') base.quarters[q] = v as QuarterSummary;
    }
  }
  const out = applyUpdate(base, { ...raw, meta: raw.meta }, opts);
  if (out.library.results.length === 0) throw new Error('The file has no valid results; refusing to replace the library with an empty one');
  return out;
}

export function totals(lib: Library): Record<Section, number> {
  return Object.fromEntries(SECTIONS.map(s => [s, lib[s].length])) as Record<Section, number>;
}

/** Small copy kept next to the library for the Insights card. */
export function summarize(lib: Library) {
  const cur = lib.meta.quarter ? lib.quarters[lib.meta.quarter]?.overall : undefined;
  const pending = Object.fromEntries((['results', 'deals', 'monthly', 'events'] as const).map(s => [s, lib[s].filter(x => x.dc === 'pending').length]));
  return {
    title: str(lib.meta.title) || 'Quarterly Results Tracker',
    season: str(lib.meta.season) || str(lib.meta.quarter),
    quarter: str(lib.meta.quarter),
    updated_at: str(lib.meta.updated_at),
    totals: totals(lib),
    pending,
    reported: cur?.reported ?? 0,
    checked: cur?.checked ?? 0,
  };
}
