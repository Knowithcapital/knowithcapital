# 08 — Admin panel guide

The admin panel is where you change the website yourself, without a developer. It lives at **`knowithcapital.com/admin`**.

## Signing in

1. Go to `/admin` and enter your admin email and password. The page is not linked from the public website.
2. The sign-in lasts about 8 hours; after that, sign in again.
3. After several wrong passwords, sign-in from that network is locked for an hour.
4. If you forget the password, ask the developer to reset it. It is a one-minute task.

The left menu has these sections.

## What each section does

### Campaigns, Email Templates, Audience
Email marketing to your own contact list.
- **Audience:** your contacts (name, email, phone). People who unsubscribe are never emailed again.
- **Email Templates:** reusable email designs with merge fields such as the recipient's name.
- **Campaigns:** choose a template and audience, send a test, then schedule or send. You can pause a campaign.
- Emails are sent through the Resend service. Opens, clicks, bounces and unsubscribes are tracked per campaign and shown on the campaign page.

### Chat Logs
Every conversation from the chat assistant and the research tools: who (name and email if signed in), the full messages, the details collected, the report generated, and any lead captured. Search by name, email or text, and filter by tool.

### Market Data
- **Generate Now:** rebuilds the Global Markets report immediately (it also rebuilds by itself every day at 6 AM).
- **Delete** an old report.
- **Risk-free rate:** the percentage used in the Sharpe ratio on the Indian Market page. Change it when interest rates change, and press Save. The page recalculates the next time its data refreshes.

### Insights
Add, edit, publish, hide or delete insights: PDF reports (converted to articles), written articles and infographics. Details in [guide 03](03-insights.md).

### Results Tracker
Updates the Quarterly Results Tracker on the Insights page.
- The top shows the season, when it was last updated and how many results, deals, monthly numbers, news items and X posts it holds.
- **Choose update file:** pick `new.json` (a normal update) or a full `library.json`. The page shows what the file contains. A normal update **adds new items and replaces matching ones**; a full library **replaces everything** (it asks to confirm).
- After **Apply update** you see how many items were added, replaced or skipped, with the reason for anything skipped (missing source, wrong date format, a link that is not http/https).
- **Download the current library.json** to keep a copy or to run your own offline process.
- The **update history** lists every update with who made it.

### FAQs
The "Investors are asking" box on the home page.
- **Add question** and answer (the answer ends with a "book a consultation" link automatically).
- **Edit** any wording, **hide** a question without deleting it, **delete**, and **reorder** with the arrows.
- If you have not added any yet, press **Import the starter questions** to edit the six built-in ones. Adding your first question replaces the built-in set.
- Changes show on the website within about a minute.

### Products
The SIF, Gift City and PMS tables on the Indian Market page.
- Pick the product type (SIF, Gift City, PMS).
- **Add product** by hand, or **upload an Excel/CSV** (use **Download template** for the columns). Only the **Name** is required.
- Choose **Add to the list** or **Replace the whole list** when uploading.
- **Hide** a row to take it off the website without deleting it.

### Client Access
The list of people allowed to sign in to the research tools and see their portfolio.
- Upload your investor sheet (Excel or CSV with a **Name** and an **Email** column). Emails already on the list are kept, not duplicated; if an email appears twice in the sheet only the first name is kept.
- Add one person by hand, **suspend** someone (they can no longer sign in) or remove them.
- The sheet you sent has 530 rows but about 393 different emails, because some emails repeat. Tell us if family members who share an email should be handled differently.

### Portfolio Reports
Upload each client's **monthly portfolio report as a PDF**. The client then sees it under **My Portfolio** and can download it. Details in [guide 07](07-login-and-client-area.md).
- Click **Choose PDF report(s)**, pick the client (type a name or email to search), check the **"as on" date**, and press **Upload**. You can add many at once.
- A client has **one** report. Uploading a new one **replaces and deletes** the previous one automatically.
- The table lists each client's current report with buttons to **open**, **download** or **delete** it.
- The page shows a notice if private file storage has not been connected yet.

### Games config
Switch each Quiz chapter on or off.

### Leads
Contacts captured by the chat assistant. Open it at `/admin/leads` (it is not in the side menu).

## What you cannot change here (ask the developer)

- Wording of the Home, Approach, Services, About and Why Choose Us pages, and the footer.
- Placeholder details: registration numbers, assets under management, years of experience, phone, email.
- Quiz questions and calculator wording and defaults.
- The ticker's list of indices.

## Good habits

- Check **Chat Logs** and your enquiry mailbox regularly in the first weeks.
- Preview an insight before you publish it.
- After uploading the investor list, test a sign-in with one client email.
- Keep your admin password in a password manager.
