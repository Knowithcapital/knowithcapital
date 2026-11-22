# Quarterly Results Tracker

The tracker shows, for the current results season: every company's results, bulk and block deals, monthly business numbers, news and events, and a few third-party views from X, each with its source and a "double-check" flag. It appears on the **Insights** page as a card and opens at **`/insights/quarterly-results`**.

## What was supplied and how it fitted together

| File | What it is |
|---|---|
| `library.json` | The data: `meta`, `results`, `deals`, `monthly`, `events`, `xposts` and `quarters` (the per-season archive) |
| `build.py` | Merges a new batch of items (`new.json`) into the library, flags double-checked items, recomputes the sector summary and bakes everything into one HTML page |
| `template.html` | The page (tabs, filters, WhatsApp share buttons) with a `/*__DATA__*/` placeholder where the data goes |
| `index.html` | The output of `build.py`: the template with the data inside |

The website now does the job of `build.py` itself, with the data kept in the database instead of in a file.

## How it works on the website

1. **Storage.** The whole library is one record in the website database (table `TrackerData`), with a small summary beside it for the Insights card and a log of every update (`TrackerUpdate`).
2. **Showing it.** `/api/v1/quarterly-results/frame` reads the library from the database and places it into the template (`src/lib/tracker/template.html`), exactly as `build.py` did. The page is shown inside the Insights page and is cached for about five minutes. The page sandboxes itself, so it cannot reach the rest of the site or a visitor's session.
3. **Updating.** In **Admin → Results Tracker** you upload an update file. The website applies the **same rules as `build.py`** (ported to `src/lib/tracker/merge.ts`; verified to produce identical totals, sector table and narrative on the supplied library):
   - an item whose key matches an existing one replaces it; everything else is kept
   - an item with a second source (`src2`) different from its first is **double-checked** (`dc: ok`); otherwise **pending**
   - only results verified against an NSE filing feed the sector aggregates and narrative
   - results of every quarter are kept; deals, events and X posts keep the latest **60 days**
   - the current quarter's summary is recomputed; earlier quarters are kept as they were
   - new checks: required fields, `YYYY-MM-DD` dates, numbers, text length, and **links must be http(s)** (anything else is dropped)
4. **Two kinds of file** can be uploaded: **`new.json`** (a normal update, merged) or a full **`library.json`** (replaces everything; asks for confirmation). The current library can be downloaded again from the same page, so the offline `build.py` workflow still works if wanted.
5. **From the command line:** `npm run tracker:import -- <file.json>` loads a full library, or add `--merge` for an update file.

## Where the data came from

Found by reading the `src` and `src2` link on every item in the supplied library:

| Section | Items | First source | Second (verifying) source |
|---|---|---|---|
| **Results** | 489 | Craytheon quarterly-results scorecard (318), then Upstox (87), Univest (20), Business Upturn, Multibagg, Free Press Journal and others | **NSE iXBRL filings** (364 items) and **Screener.in** (97) |
| **Bulk and block deals** | 120 | **Trendlyne** bulk/block deals (88) and **NSE** (32) | **NSE** bulk/block data (86), a few news sites |
| **Monthly business numbers** (for example monthly vehicle sales) | 15 | Upstox, RushLane, Auto India Daily, Autocar India | Autocar Pro, 5paisa, DriveSpark and others |
| **News and events** | 146 | Upstox (35), NSE (31), Trendlyne (17), Business Upturn, Investywise, Business Standard | none recorded (marked pending) |
| **Third-party views** | 693 | **X (Twitter)**, from two handles (@nid_rockz, @AlfafinderIndia), 3 to 22 Nov 2026 | none |

The page shows "Source: NSE" only where an NSE filing confirms the figures; everything else is labelled **Unverified**. The template says the data refreshes at **6 AM, 11 AM and 2 PM IST**, which matches how the file was being produced: someone (or something) collected the new items from the sources above, wrote `new.json`, and ran `build.py`.

## What is automated and what is not

- **Automated and tested:** storage, merging, double-check flags, sector summary, the page, the Insights card, the admin upload and the update log.
- **Not automated: fetching new data from the sources.** The collection step is the same as before (producing `new.json`). The sources above are third-party sites whose terms and bot protection are not ours to bypass:
  - **NSE** data is licensed; its website blocks scripted access.
  - **Trendlyne, Screener.in and Craytheon** are commercial sites; scripted collection may breach their terms.
  - **X** needs the paid API.
  - News articles need reading and judgement.
- **To automate it properly** we need permitted access: an **NSE data licence or feed**, the **Trendlyne / X API subscriptions**, or another provider's API. With keys for those, a scheduled job can fetch new items and run them through the same merge. Until then, the update file is prepared the same way as before and uploaded in the admin panel.

## Questions for Abhinav

1. **Who prepares `new.json` today, and how often?** The page says 6 AM, 11 AM and 2 PM, so should we expect three uploads a day, or one?
2. **Licences.** Does he have permission to republish NSE data, Trendlyne deal data and verbatim X posts on a commercial website? If not, which parts should be dropped (the X posts are the biggest question)?
3. **Compliance.** The page carries "For information only … not a recommendation", but it lists promoter buying and selling, marquee-investor deals and third-party stock commentary. Has this been reviewed against SEBI's rules for who may publish research?
4. **ARN.** The tracker's disclaimer names **ARN 46498**. The website still shows a placeholder ARN. Is 46498 correct, so it can replace the placeholder in the footer and trust bar?
5. **Do we want automatic collection?** If yes, which paid feeds or APIs will he subscribe to?
