# 02 — Markets

The Markets page (`/market-concentration`) has two views, switched at the top: **Global Markets** and **Indian Market**. The Indian Market view has five tabs: **Mutual Funds, ETFs, SIF, Gift City, PMS**.

---

## Global Markets

**What visitors see:** a table of 20 countries with: market size, how concentrated the top 10 and top 1 stocks are, 1-year return, the main index, the biggest company and what drove the return. Filters for developed or emerging markets and for concentration level (low below 35%, medium 35–55%, high above 55%), and clickable column headings to sort.

**Where each column comes from**

| Column | Source |
|---|---|
| Index name and 1-year return | **Yahoo Finance [automatic]**. Trailing 12-month price return of each country's main index, in local currency |
| Biggest company | **Yahoo Finance [automatic]**. The largest company by market value, picked live from a short list per country |
| Market cap, top-10 share, top-1 share, return driver | **AI estimates [AI]** (Google Gemini), anchored to the live market value of the biggest company. These columns are marked **"est."** on the page because they are indicative, not exchange-reported |

**Where it is stored:** the daily report is saved in the website database. Page visits read the saved report, so no AI call is made when someone opens the page.

**When it refreshes:** every day at about **6:00 AM India time** by an automatic job. You can also press **Generate Now** in Admin → Market Data.

**Logic:** concentration is coloured by the thresholds above (blue low, amber medium, red high). A warning triangle marks countries flagged as highly volatile.

---

## Indian Market — Mutual Funds

**What visitors see:** pick a category (Large Cap, Mid Cap, Small Cap, Flexi Cap, Large & Mid Cap, Multi Cap, ELSS, Aggressive Hybrid, Overseas Funds), pick a tab, search, and sort by any column. The table shows **every Regular-plan fund** in the category and loads more rows as you scroll. Direct plans are not shown.

**Where the data comes from [automatic]**

| What | Source |
|---|---|
| The list of funds, their category, latest NAV | AMFI's daily NAV file (the official source) |
| Daily NAV history for each fund | AMFI's NAV records, republished by the TigZig MF API. The mfapi.in service is a backup for any fund TigZig does not return |
| AUM, riskometer, benchmark, fund managers, expense ratio, exit load, minimum investment, launch date | AMFI / SEBI filings via the TigZig MF API |

**Only the Regular plan, Growth option** is listed. Dividend (IDCW), bonus, payout and segregated lines are excluded.

**Where it is stored:** the report is **not** kept in the database. The website builds it from the sources above and keeps a saved copy in its cache for up to a day. The 6:00 AM job expires that copy, and the next visitor triggers a rebuild, which takes about 20–30 seconds the first time.

**The six tabs and what each shows**

| Tab | Shows |
|---|---|
| **Snapshot** | 1Y return, 3Y and 5Y CAGR, AUM, NAV, SEBI riskometer |
| **Returns** | 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, 10Y returns, and SIP returns for 1, 3 and 5 years |
| **Rolling** | For a chosen window (1, 3 or 5 years) over the last 3 or 5 years: average, median, worst, best and the share of times positive |
| **Portfolio** | AUM, benchmark and the asset mix the scheme document allows. Holdings and sector weights are not available from free sources |
| **Risk** | SEBI riskometer, risk compared with the category, 3-year volatility, maximum drawdown, Sharpe ratio, return for risk and 52-week high/low NAV |
| **Details** | Fund manager and since when, expense ratio, exit load, minimum investment, launch date, AUM |

**Logic (plain English).** The full formulas are in [fund-metrics-formulas](../fund-metrics-formulas.md); the short version:

- **Returns:** compare today's NAV with the NAV on the same date in the earlier period. Up to 1 year it is a plain percentage; for longer periods it is a yearly (CAGR) figure.
- **SIP return:** the yearly return of putting in the same amount every month and cashing in at today's NAV.
- **Volatility:** how much the NAV jumps from day to day over 3 years, shown as a yearly figure. Higher means a bumpier ride.
- **Maximum drawdown:** the biggest fall from a peak to a later low in 3 years.
- **Sharpe ratio:** (yearly return minus the risk-free rate) divided by volatility. Higher is better. **The risk-free rate is 6.5% by default and you can change it** in Admin → Market Data.
- **Risk vs category / Return for risk:** funds in the same category are ranked and split into four equal groups (quarters), so a fund shows as "Lowest risk" or "Top quarter" relative to its peers.
- **The riskometer is not calculated by us.** It is the label SEBI requires every fund to carry.
- A fund younger than the period (for example under 3 years for risk) shows "—".

**Why a number can look different from another website:** other sites may use a different date, a different risk-free rate or a different way to count days. Ours follows the AMFI/SEBI convention described above.

---

## Indian Market — ETFs

- Same table and tabs as mutual funds, for Equity, Gold, Silver, Debt and International ETFs.
- Figures use the ETF's **NAV, not its exchange traded price**.
- AMFI sometimes files gold and silver ETFs under "Equity ETF"; the website re-files them by name.
- If an ETF's units were split or merged (its NAV jumps by more than 40% in a day), returns across that date are left blank rather than shown wrongly.

---

## Indian Market — SIF, Gift City, PMS

- **What visitors see:** a table of the curated products (name, provider, strategy, minimum investment, 1/3/5-year returns, AUM, fees, notes and a link). Until you add products, the tab says "We are curating this list".
- **Where it comes from [admin]:** there is no free data feed for these, so **you supply it** in Admin → Products, by typing rows or uploading an Excel/CSV sheet. A downloadable template is on that page.
- **Where it is stored:** the website database (the products table).
- **Logic:** none. What you enter is what visitors see. You can hide a row without deleting it.
- **Waiting on:** your sample sheet and the columns you want (see the action checklist).

---

## Quick answers

- **How often is data updated?** Daily at about 6 AM (ticker every minute).
- **Can we change a number by hand?** Not for mutual funds, ETFs or global markets, which are calculated. SIF, Gift City and PMS are fully manual.
- **What if a data source is down?** The page still lists funds from AMFI; the affected columns show "—". Global Markets keeps showing the last saved report.
