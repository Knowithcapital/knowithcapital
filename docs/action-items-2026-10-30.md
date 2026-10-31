# Client call 30 Oct 2026 — action checklist

Source: Gemini notes and the full transcript of the 30 Oct 2026 call (Abhinav Mehta and Priyank Bohra, 1h06m). The auto-notes garbled a few names and terms, so every item below was checked against the transcript.

- `[x]` done · `[ ]` open
- **Us** = Priyank and Ayushi · **Abhinav** = the client
- Items from the 8 Oct call that are still open are tracked in [action-items-2026-10-08.md](action-items-2026-10-08.md). This file only covers what came out of the 30 Oct call.
- **Next meeting: Monday 2 November.**

---

## 1. Received from Abhinav

- [x] **Terms of service** (`Terms of service.pdf`, 23 pages)
- [x] **Disclaimer** (`Disclaimer.pdf`, 2 pages)
- [x] **Privacy policy** (`Your privacy is important to us.docx`)
- [x] **Investor list** (`Email & Investors.xlsx`): columns Client and Email, 530 rows, all emails valid, 393 unique (about 137 repeats, probably family members sharing an email)

---

## 2. Our tasks

### Fund risk and returns (Markets → Indian Market)

- [ ] **Fix max drawdown showing for only 2 funds.** Likely the same root cause as the empty 1Y/3Y/5Y columns (NAV history only loaded for a quarter of the funds on the live site). The fix is committed locally as `f2971d1` but **not pushed**. Push, then recheck every category on the live site. — Us
- [x] **Relative risk rating in quartiles** within each category (best quarter to worst quarter), shown next to the SEBI riskometer label. — Us **Done:** "Risk vs category" and "Return for risk" columns on the Risk tab (code done, needs deploy).
- [x] **Keep the SEBI riskometer label** alongside our own measures (already shown; keep when adding quartiles). — Us **Done.**
- [x] **Make the risk-free rate (currently a fixed 6.5%) an admin-editable setting** so Sharpe updates when rates change. The source has no API, so either update it by hand or find an API. Define the Sharpe formula once so it applies to all funds. — Us **Done:** editable under Admin → Market Data; Sharpe recalculates on the next refresh. It is manual, not linked to a live benchmark rate (code done, needs deploy and the new database column).
- [x] **Rolling returns matrix** with selectable windows (for example a 1-year window over a 5-year period). — Us (Abhinav to send granular details) **Done:** new Rolling tab, window 1/3/5 years over the last 3 or 5 years (average, median, worst, best, % positive). Abhinav may still send finer requirements (code done, needs deploy).
- [x] **Add overseas funds** (international fund-of-funds) as a category; Abhinav expects the existing data source to cover them. — Us **Done:** "Overseas Funds" category, 48 funds (code done, needs deploy).
- [x] **Send Abhinav our current formulas** (returns, SIP, volatility, drawdown, Sharpe) so he can validate them. — Us **Written** in [fund-metrics-formulas.md](fund-metrics-formulas.md); still to be sent to him.
- [ ] **Fine-tune the performance data** so every fund has complete data, once Abhinav's formula arrives. — Us
- [ ] **Show-all-rows question:** Abhinav said showing every row is "too much" and should wait for phase two. We already show the whole category. Confirm what he wants to keep before changing anything. — Us / Abhinav (see section 4)

### Gift City, SIF and PMS

- [ ] **Get columns and a sample sheet** for Gift City, SIF and PMS (Abhinav promised to post on the WhatsApp group). — Abhinav
- [ ] **Load and shape the Gift City, SIF and PMS lists** once the sample arrives (Admin → Products already accepts Excel/CSV). — Us
- [ ] **Decide whether those pages should require login first**, as on the reference site Abhinav showed. — Us / Abhinav

### Login page

- [x] **Existing clients link:** point it at the plain FundzBazar login link (confirmed correct). Do not use the "client desk" link; it is only for certain clients. — Us **Partly done:** the setting is in place (`fundzbazarLogin` in `src/lib/config/site.ts`); it falls back to the current link until Abhinav confirms the exact FundzBazar login URL.
- [x] **New-client link:** keep it going to the FundzBazar account-opening page. — Us **Done.**
- [x] **Move the mobile app QR code** from the existing-client box to the "new to Knowith" box. — Us **Done.**
- [ ] **Check the QR code on iPhone.** It opens the Play Store on Android; the App Store was not verified. — Us
- [x] **Add a "Portfolio data" option** next to "Research & tools" on the login page (OTP sign-in, no password). — Us **Done:** "Your portfolio" choice next to "Research & tools" on the login card; signs in with the email code and opens the portfolio page.

### Client portfolio reports (new feature)

- [x] **Admin upload of per-client reports** (HTML or Excel exported from Abhinav's analytics tool), linked to the client's email. — Us **Done:** Admin → Portfolio Reports (code done, needs deploy and the new table).
- [x] **Client view after OTP login:** a logged-in client sees their own report. — Us **Done:** Sidebar → My Portfolio, shown in a sandboxed frame; a client can only open their own report.
- [ ] **Agree a universal report layout** and have the backend format uploaded reports into it; remove information Abhinav does not want shown. — Us
- [x] **Support bulk upload** (several clients' reports at once). Abhinav said bulk upload is not possible on his side; Priyank said we can support it. — Us **Done:** choose several HTML files at once; the client is pre-filled from the file name when it matches.
- [ ] **Optional automatic email** of the report to each client. — Us / Abhinav to decide
- [ ] **Merge the interactive HTML chart** (live values when you move the cursor) into the final report, after the universal layout is set. — Us
- [ ] **Draft a final report** from Abhinav's two HTML files and his requirements, and bring it to the next meeting for review. — Us

### Custom investor performance chart

- [ ] **Design the chart:** net investment value, gross investment (accounting basis) and real banking value over time. — Us
- [ ] **Decide the data route** (needs date-wise transactions: capital in, dates, valuations; Abhinav says he has these in his files). — Us / Abhinav
- [ ] **Show fund changes on the chart** (when a client moves between funds), if Abhinav wants it. — Us

### Book a consultation and non-client reviews

- [x] **Reason selector at the top of the form as three buttons:** Portfolio review, General inquiry, General assistance. Remove "Mutual fund allocation". — Us **Done** on both the Contact page and the homepage form.
- [ ] **Portfolio-review intake for non-clients:** automatic email asking for ISINs, unit counts and fund names; then generate the report and send it automatically or by hand; use their contact details to follow up if the data looks wrong or false. — Us (Abhinav to confirm the process)
- [ ] **Consider reading an MF Central statement** as the data source for non-client reviews. — Abhinav is thinking it over

### Homepage, Insights and documentation

- [x] **Remove the hardcoded "guided by experience" text** from the homepage. — Us **Done:** the whole Leadership section (including the "Placeholder Name" cards) is removed.
- [x] **Keep that section minimal** (possibly just Abhinav's name); no separate team-profile page. — Us **Done** (section removed; add a name later if Abhinav wants one).
- [ ] **Confirm new Insights articles appear automatically on the homepage** (Priyank confirmed they do; verify with a test article). — Us
- [ ] **Write documentation** for market insights, how the quiz works, and how to use the admin panel, so Abhinav can self-serve when the team is unavailable. — Us
- [ ] **Add the photo story to Our Story** (historical photos with fund managers and personal milestones), once the photos arrive. — Us

### Legal text

- [ ] **Do not publish the three FundzBazar documents unchanged.** They name Prudent Corporate Advisory Services Ltd. and its ARN, and the privacy policy describes data we do not collect (PAN, date of birth, bank details, passwords). Agree with Abhinav: Knowith-specific versions, or a clear note that they apply to the FundzBazar platform plus a short notice for our own site. — Us / Abhinav
- [ ] **Add the final legal text** to the Terms, Privacy and Disclaimer pages. — Us

### Client list

- [ ] **Import the investor sheet** through Admin → Client Access (duplicate emails keep only one entry and the first name). — Us
- [ ] **Confirm how repeated emails should be handled** (one email shared by several family members). — Us / Abhinav

### Found and fixed while working on the list

- [x] **The homepage contact form only showed a "demo" popup and sent nothing.** It now uses the same working form as the Contact page, so enquiries from the homepage reach the inbox. (Code done, needs deploy.)
- [x] **Navbar logo no longer squeezes against the menu on mid-size screens;** the menu collapses to the hamburger below 1100px. (Code done, needs deploy.)
- [x] **Removed stale copies of the old insecure endpoints from the working folder** (public seed/login routes and the open grok proxy). They were untracked, identical to the version an earlier commit removed on purpose, and they broke local development.

### Launch

- [ ] **Plan versioned releases** for the 1 January target: basic features first, time-consuming items later. — Us
- [ ] **Agree the phase-one and phase-two split** with Abhinav (for example, rolling returns and full lists in phase two). — Us / Abhinav

---

## 3. Abhinav's tasks

- [ ] **Sample sheet and required columns for Gift City, SIF and PMS**, posted on the WhatsApp group.
- [ ] **Formula for fine-tuning performance data** (he said he would work on it that night).
- [ ] **Both HTML report files** plus his requirements: how to present the data and what to remove.
- [ ] **List of project issues** and the information we need from him.
- [ ] **Photos, improved and uploaded to Google Drive** with the share link. PNG or JPG, high quality. Fix lighting and blur with Canva or Picsart (free "unblur" tools) without changing faces.
- [ ] **Transaction data** for the custom investor chart, or a decision on how we can get it.
- [ ] **Pending items he named himself:** A4, A5, the quiz, taxation and rolling returns.
- [ ] **Decide the portfolio-review intake process** for non-clients.
- [ ] **Legal text decision** (see the legal section above).
- [ ] **iOS app link** for the QR code, if one exists.
- [ ] **Checkpoint:** anything he promised "in the meantime" should reach us before Monday.

---

## 4. Questions to confirm on Monday

1. **Show all rows or not?** We already show the whole category. Does he want the full list now, or only the top funds until phase two?
2. **Our Story page:** yes or no? He said no team-profile page, but he also wants a photo story with fund managers.
3. **Login-gated product pages:** should Gift City, SIF and PMS require OTP login first, like the reference site?
4. **Legal text:** which version should we publish, and does Knowith have its own ARN (the documents show Prudent's, 9992)?
5. **Client transaction data:** what can he export for the custom chart?
6. **Portfolio-review requests from non-clients:** what is the intake flow?
7. **iOS app link** for the QR code.
8. **Colours:** Priyank asked about the website colours and he said it looks fine; confirm he is happy with the recoloured logo (teal and gold instead of blue).

---

## 5. Corrections to the call notes

- **The "Very High" risk label is the SEBI riskometer**, copied from AMFI/SEBI filings. We have no threshold of our own that assigns it. Volatility, drawdown and Sharpe are the numbers we calculate. Priyank's explanation on the call was inaccurate; clarify on Monday.
- **"SB" means SEBI**, and "SAF" means SIF.
- **Garbled in the transcript:** the name of Abhinav's external portfolio analytics tool, and the names of the two fund managers in his photos.

---

## 6. Deploy notes for this batch

- [ ] **Push the drawdown/NAV-history fix** (`f2971d1`) and the new work. Two schema changes are additive and are created by the build's `prisma db push`: the `ClientReport` table and a new `riskFreeRatePct` column on `AppConfig`.
- [ ] **After deploying, open Admin → Market Data** and check the risk-free rate card loads, then **Admin → Portfolio Reports** and **Admin → FAQs / Products**.
- [ ] **Test the portfolio flow end to end** with a real client email from the imported list: upload a sample HTML report, sign in with the email code on the login page, choose "Your portfolio".
- [ ] **Check that an HTML report with interactive charts renders** inside the sandboxed frame (scripts run but cannot touch the site). Reports that load charts from the internet will need that internet access.
- [ ] **Reports are limited to 4 MB each.** If Abhinav's HTML files are larger (for example with embedded chart libraries), tell us.
