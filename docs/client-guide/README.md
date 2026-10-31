# Knowith Capital website — guide for Abhinav

This guide explains, page by page, **what the website shows, where every piece of information comes from, where it is stored, and the logic behind it.** It is written for you, not for developers, so there is no code in it.

## How to use this guide

| Page of the website | Guide |
|---|---|
| Home, Approach, Services, About, Why Choose Us, footer | [01 — Home and company pages](01-home-and-company-pages.md) |
| Markets (Global, Indian mutual funds, ETFs, SIF, Gift City, PMS) | [02 — Markets](02-markets.md) |
| Insights and Perspectives | [03 — Insights](03-insights.md) |
| Quiz (investor games) | [04 — Quiz](04-quiz.md) |
| Calculators | [05 — Calculators](05-calculators.md) |
| Contact, Book a Consultation and the chat assistant | [06 — Contact, enquiries and the chat assistant](06-contact-and-enquiries.md) |
| Login, research tools and "Your portfolio" | [07 — Login and the client area](07-login-and-client-area.md) |
| The admin panel (what you can change yourself) | [08 — Admin panel guide](08-admin-panel-guide.md) |
| Where all information is kept, who can see it, and which outside services we use | [09 — Where your data lives](09-where-your-data-lives.md) |

If you only read one document, read **08** (what you can do yourself) and **09** (privacy and data).

## Four kinds of "where it comes from"

Every figure or piece of text on the website is one of these:

1. **Typed into the website's code.** Text like the Approach page or the services list. Only a developer can change it. Marked **[developer]** in this guide.
2. **Saved in the website's private database.** Things you or your clients create: FAQs, products, insights, client emails, portfolio reports. You change these in the admin panel. Marked **[admin]**.
3. **Fetched from an outside source and calculated.** Market prices, fund returns, risk numbers. Nobody types these in. Marked **[automatic]**.
4. **Written by the AI.** The article layout in Insights, the chat assistant, the research tools. Marked **[AI]**.

## Words used in this guide

- **NAV:** a mutual fund's price per unit for the day.
- **AMFI:** the official body that publishes mutual fund NAVs and categories.
- **CAGR:** return per year, smoothed, for periods longer than a year.
- **Admin panel:** the staff area at `/admin` where you manage the website.
- **OTP / email code:** the 6-digit code emailed to a client to sign in. There is no password for clients.
- **Cache:** a saved copy the website keeps for a while so pages open quickly.

## Dates and limits you should know

- Market and fund data refresh **once a day at about 6 AM India time**. The ticker bar refreshes every minute.
- Several items still show **placeholder text** (registration numbers, assets under management, years of experience, phone and email). These are listed in guide 01 so they can be replaced with real details before launch.
