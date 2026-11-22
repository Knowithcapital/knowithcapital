# 07 — Login and the client area

Covers the **Login** page (`/login`), the **research tools** and **Your portfolio** that registered clients use after signing in.

## The login page: three boxes

| Box | For | What it does |
|---|---|---|
| **01 Existing client** | People who already invest with you | A button to the **FundzBazar** client login (FundzBazar holds the investments and transactions, not this website) |
| **02 New to Knowith?** | New investors | A button to open a free account on FundzBazar, a QR code to download the FundzBazar mobile app, and a link to book a consultation |
| **03 Research, tools & your portfolio** | Registered clients | Sign in with an emailed code, then choose **Research & tools** or **Your portfolio** |

**The links and QR codes** are typed into the website's settings **[developer]**. The existing-client button still points to the account-opening link until you confirm the exact FundzBazar sign-in address.

## Signing in with an email code (box 03)

1. The client enters their email.
2. **Only emails on your approved list can sign in.** The list is managed in **Admin → Client Access**. If the email is not on it, no code is sent.
3. The website emails a **6-digit code** (sent through the Resend email service). The code works for **10 minutes** and only once.
4. The client types the code and is signed in. **There is no password.** The sign-in lasts 30 days on that device.

**Protection:** a client can ask for three codes per hour; after a couple of wrong codes sign-in is locked for an hour; and the number of attempts per network is limited. Suspending a client in Client Access stops them immediately, even if they are signed in.

**What is stored about a client [database]:** name, email, whether they are active, and when they last signed in. Codes are stored only in scrambled (hashed) form and expire. Nothing else.

## Research tools (after sign-in) [AI]

| Tool | What the client gets |
|---|---|
| **Investment Advisor** | A guided conversation that ends in a written investment plan |
| **Financial Health** | A financial-health review from their income, expenses and goals |
| **Portfolio Analyzer** | A review of the portfolio they describe, with rebalancing ideas |
| **SIP Goal Planner** | Whether a goal is feasible and a suggested approach |
| **Tax Advisor** | A comparison of old and new tax regimes with planning ideas |
| **Market News** | A market briefing built from recent news headlines (Google News) summarised by the AI |

**How they work:** the client chats; the AI (Google Gemini) asks for details step by step, then a report is generated. Calculations come from our own formulas where numbers are needed, and the AI writes the explanation.

**Where it is stored:** each conversation is saved in the website database tied to the signed-in client: the messages, the details collected (for example age, income, goals) and the generated report. It also records the AI usage and cost for that conversation.

**Who can see it:** only you, in **Admin → Chat Logs**, where you can search and open any conversation. Clients do not see other clients' conversations. **Please tell clients that what they type is saved**, or tell us if you would prefer to stop saving it.

**Cautions**
- The tools are AI-assisted guidance, not advice. Each report carries a disclaimer.
- The **Tax Advisor currently uses the 2024-25 tax slabs**. These need updating to the current year before the tool is promoted. Please tell us whether to pause it until then.

## Your portfolio (the client's monthly report)

**What the client sees:** after signing in and choosing **Your portfolio**, a **My Portfolio** page opens in the side menu. It shows their latest monthly portfolio report as a PDF: they can read it on the page, open it in a new tab, or **download** it whenever they want. The page shows the "as on" date, the file name and size. If there is nothing yet, a friendly "not ready yet" message.

**How it works**
1. You prepare the monthly report as a **PDF** (for example the "Investment Snapshot" report).
2. In **Admin → Portfolio Reports** you upload it for the client. You can choose many PDFs at once; the client and the "as on" date are filled in from the file name when it contains them, and you can correct them.
3. Each client has **one** report. **When you upload a new one, the previous one is replaced and its file is deleted automatically.** Only the latest is ever kept.
4. When that client signs in, they see their report. Nobody else can open it.

**Where it is stored:** the PDF is kept in **private file storage** (Cloudinary) that has no public address. The website database keeps only a small record: which client, the file name and size, the "as on" date and when it was uploaded. The website streams the PDF to the client only after it has checked who is signed in; the storage address itself is never shown to the client.

**Limits**
- Each PDF can be up to **10 MB** on the current storage plan. Bigger reports (the sample is about 15 MB) need to be compressed first, or the storage plan upgraded. The admin page tells you if a file is too large.
- If a client is suspended or removed in Client Access, they lose access immediately. Removing a client also deletes their PDF.
- Phones sometimes cannot show a PDF inside a page, so the page always offers **Open in new tab** and **Download PDF** buttons.
