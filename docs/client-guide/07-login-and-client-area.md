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

## Your portfolio (client's own report)

**What the client sees:** after signing in and choosing **Your portfolio**, their own latest portfolio report, in a framed page. If you have uploaded several periods, they can switch between them. If there is nothing yet, a friendly "not ready yet" message.

**How it works**
1. You create the report in your analytics tool and export it as an **HTML file**.
2. In **Admin → Portfolio Reports** you upload it against the client's email. You can choose many files at once; if a file name contains the client's email or name, the client is pre-selected. Uploading again for the same client and period replaces the earlier file.
3. When that client signs in, they see their report. Nobody else can open it.

**Where it is stored:** the report file is kept in the website database against that client. Hidden reports stay stored but clients cannot see them.

**Safety design:** the report runs inside a protected frame. Its charts and hover values work, but the report cannot read the website, the client's session or anything else.

**Limits**
- Each file can be up to **4 MB**.
- Interactive pieces that load code from the internet need the client to be online.
- A common look for all reports (the "universal format") is still to be agreed once you share your two HTML files.
