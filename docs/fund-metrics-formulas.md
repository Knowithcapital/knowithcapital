# How the fund numbers are calculated

For Abhinav to validate. Every figure on **Markets → Indian Market** is either copied from a public source or calculated from the fund's daily NAV (net asset value) history. Nothing is estimated by AI.

## Where the data comes from

| What | Source |
|---|---|
| List of funds, categories, latest NAV | AMFI's daily NAV file (amfiindia.com) |
| Daily NAV history for every fund | AMFI's NAV records, republished by the TigZig MF API (fallback: mfapi.in, also built on AMFI data) |
| AUM, riskometer, benchmark, fund managers, expense ratio, exit load, minimum investment, launch date | AMFI / SEBI filings via the TigZig MF API |

Only the **Regular plan, Growth option** is listed. Dividend (IDCW), bonus, payout and segregated lines are excluded. Data refreshes once a day (the 6 AM job).

## Returns

"Latest NAV" is the most recent NAV. For a past point we use the NAV on the same calendar date in the earlier period, or the nearest earlier trading day if that date was a holiday.

- **1M, 3M, 6M, 1Y, YTD** are plain (absolute) returns: `(latest NAV ÷ past NAV − 1) × 100`.
  YTD uses the NAV on 31 December of the previous year.
- **3Y, 5Y, 10Y** are annualised (CAGR): `((latest NAV ÷ past NAV) ^ (1 ÷ years) − 1) × 100`.
- A fund younger than the period shows "—".
- If an ETF's NAV was re-based (units split or consolidated, shown as a one-day move of more than 40%), returns that span that date are left blank rather than shown wrongly.

## SIP returns

A SIP of equal instalments, one per month, on the same date each month, with every unit redeemed at the latest NAV.
The figure is the annualised return (XIRR) that makes the instalments equal the final value, solved numerically.
Shown for 1, 3 and 5 years.

## Risk (last 3 years of daily NAVs)

A fund needs a full 3-year track record, otherwise these show "—".

- **Volatility:** standard deviation of daily returns × √252, as a percentage. Higher means a bumpier ride.
- **Maximum drawdown:** the largest fall from a peak NAV to a later low, as a percentage.
- **Sharpe ratio:** `(3-year CAGR − risk-free rate) ÷ volatility`.
  The risk-free rate defaults to **6.5%** and can be changed by an admin under **Admin → Market Data**. It is not yet pulled automatically from a benchmark rate.
- **52-week high / low:** highest and lowest NAV in the last 365 days.
- **Riskometer:** the SEBI-mandated label (Low … Very High). It is copied from the fund's filing, not calculated by us.

### Relative risk (quarters within a category)

- **Risk vs category:** funds in the same category are sorted by volatility and split into four equal groups. *Lowest risk* is the calmest quarter, *Highest risk* the most volatile.
- **Return for risk:** the same split on the Sharpe ratio. *Top quarter* is the best risk-adjusted return.
- Needs at least four funds with data in the category.

## Rolling returns

For a chosen **window** (1, 3 or 5 years) and **look-back period** (last 3 or 5 years): take every start date, hold for the window, and record the return. Windows are sampled about twice a week.
We then show the **average, median, worst, best** and the **share of windows with a positive return**. Windows longer than a year are annualised.
A fund needs history covering the look-back period plus the window, otherwise it shows "—".

## Known limits

- Returns are based on NAV, which is net of expenses; they are not adjusted for exit load or tax.
- ETF figures use the NAV, not the exchange traded price.
- Portfolio holdings and sector weights are not available from these sources, so the Portfolio tab shows only the benchmark and the allowed asset mix.
- Manager names, fees and exit load come from filings and can lag.
