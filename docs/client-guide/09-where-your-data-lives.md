# 09 — Where your data lives

This page lists **every kind of information the website keeps**, where it is kept, who can see it, and which outside services touch it. It is the answer to "how do we make sure our data is safe and private?"

## The short version

- The website stores **only a client's name and email** to let them sign in. It does **not** store phone numbers, PAN, date of birth, bank details or passwords for clients.
- Client information sits in a **private, password-protected database** that the public cannot browse. It is reached only by the website itself, by the developers' secured accounts, and through the **password-protected admin panel**.
- The website has **no connection to your clients' investment accounts or holdings**. Those stay with FundzBazar and your own tools.
- Two things clients *can* put in: what they **type into the research tools** (saved, and visible to you in Chat Logs) and the **portfolio report you upload for them**.

## What is kept, and where

| Information | Where it is kept | Who can see it |
|---|---|---|
| **Approved client list:** name, email, active or suspended, last sign-in | Private website database | You (Admin → Client Access) |
| **Sign-in codes** | Database, in scrambled form only, expiring after 10 minutes | Nobody can read a code back |
| **Client portfolio reports** (the monthly PDF you upload) | **Private file storage (Cloudinary) with no public address.** The database holds only the file name, date and which client it belongs to | You, and only the client it belongs to. The website checks who is signed in before it hands the file over |
| **Research-tool conversations** (messages, details the client typed, the generated report, AI usage) | Private website database | You (Admin → Chat Logs) |
| **Chat assistant conversations and leads** (visitors may type name, email, phone, city, investment range) | Private website database | You (Admin → Chat Logs and Leads) |
| **Contact-form enquiries** | **Not** in the database. They are emailed through Web3Forms to the receiving mailbox | Whoever reads that mailbox |
| **Marketing audience** (names, emails, phones you add) and campaign results | Private website database | You (Admin → Audience, Campaigns) |
| **Quiz leaderboard** (a name the player types and a score) | Website database | Public on the leaderboard (top ten) |
| **Quiz progress during a visit** | The visitor's own browser, until the tab closes | The visitor only |
| **FAQs, Products, Insights text, Global Markets report** | Website database | Public once published |
| **Quarterly Results Tracker** (results, deals, monthly numbers, news, X posts) | Website database (one record plus an update log) | Public on the Insights page; updates by admins only |
| **Insight PDFs, cover pictures, extracted charts** | Public file storage (Cloudinary) | Public once published (drafts are not linked) |
| **Calculator inputs and results** | Not stored anywhere | Nobody |
| **Indian fund and ETF tables** | Not in the database; built from public sources and kept in a temporary cache for up to a day | Public |
| **Admin passwords** | Database, in scrambled (hashed) form | Nobody can read them back |

## Outside services and what they see

| Service | Used for | What it receives |
|---|---|---|
| **Vercel** | Hosts the website and runs the daily scheduled jobs | Everything the website serves |
| **Cloudinary** | File storage: public insight files, and private client portfolio PDFs | The uploaded files |
| **Neon** | The private database | All stored information above |
| **Google Gemini (AI)** | Chat assistant, research tools, PDF-to-article, Narrative Planner, estimates in Global Markets | The text a person types into those tools, and the pages of PDFs you upload for Insights. It does **not** receive the client list |
| **Resend** | Emails: sign-in codes and campaigns | The recipient's email and the message |
| **Web3Forms** | The contact-form enquiries | What the visitor typed in the form |
| **Yahoo Finance** | Ticker and Global Markets prices | Nothing about people |
| **AMFI, TigZig, mfapi.in** | Mutual fund and ETF data | Nothing about people |
| **Google News** | Headlines for Market News | Nothing about people |

## How access is protected

- **Admin panel:** email and password, sessions expire after about 8 hours, repeated wrong passwords lock the sign-in, and the panel can be limited to chosen office networks if you want.
- **Clients:** an emailed one-time code, valid for 10 minutes and once only; limited requests; lock-out after repeated wrong codes; suspending a client takes effect immediately.
- **Client reports:** stored privately, served only to the client they belong to (or an admin) after the website checks who is signed in. A new monthly upload deletes the previous file.
- **Passwords and sign-in cookies** are stored in secured, tamper-proof form.
- All traffic uses secure (HTTPS) connections.

## Honest limits

- **The developers can technically reach the database** (with their secured accounts) to run the website. If you want a stricter arrangement, such as access only when you approve it, tell us and we can agree a written process.
- **The AI services process what people type** into the chat and research tools. Do not ask clients to type PAN, account or bank numbers into them.
- **Contact-form enquiries pass through Web3Forms**, an outside service, before reaching your mailbox.
- **Removing a client** deletes their portfolio PDF and sign-in record. Past chat logs may keep the email they signed in with, so you can still read old conversations. Tell us if you want those deleted too.
- A **privacy notice for this website** is still to be written (see guide 01, "Legal text"). It should list the points on this page.

## Suggested wording for your clients

> We use your email only to let you sign in to our research tools and to show you your own portfolio report. We do not collect your phone number, PAN or bank details on this website. Your information is kept in a private, access-controlled database, visible only through our password-protected admin panel, and is never shared or sold. If you use our AI tools, what you type there is saved so we can serve you better; please do not enter PAN or bank details.
