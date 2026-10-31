# 01 — Home and company pages

Covers: **Home**, **Approach** (`/approach`), **Services** (`/services`), **About** (`/about`), **Why Choose Us** (`/why-choose-us`), and the **footer** and **top menu** shown on every page.

## The top menu and ticker bar

**What visitors see:** the logo, the links (Approach, Services, Calculators, Quiz, Markets, Insights, Contact), the buttons Grid, Login and Book a Consultation, and under them a moving strip of live prices.

**The ticker strip [automatic]**
- Shows: Sensex, Nifty 50, Bank Nifty, USD/INR, Nasdaq, S&P 500, Bitcoin and Ethereum, each with its change since the previous close.
- Source: Yahoo Finance (a free, unofficial feed). Indian prices are typically about 15 minutes delayed, so the strip is a market-mood indicator, not a trading screen.
- How it works: each visitor's browser asks our server for the prices every minute, and the server asks Yahoo. The server keeps a copy for about a minute.
- Stored: nowhere. Prices are not saved.
- If Yahoo is down, the strip hides itself.
- The Grid button opens `grid.knowithcapital.com` in a new tab. The links and buttons are set in the code **[developer]**.

## Home page

| Section | What it shows | Where it comes from |
|---|---|---|
| **Hero** | Headline, short text, the three figures (assets under management, years of experience, families served), the "Investors are asking" box | Headline and figures are typed into the code **[developer]**; the questions come from the database **[admin]** |
| **Investors are asking** | Questions that open to show an answer, plus a "book a consultation" link. The box scrolls when there are many | Admin → FAQs. Until you save your own, six starter questions show |
| **Trust bar** | Registration and affiliation lines under the hero | Typed into the code **[developer]** |
| **Approach** | A short summary of how Knowith works | Typed into the code **[developer]** |
| **Services and testimonials** | Service cards and a rotating set of client quotes | Typed into the code **[developer]** |
| **Products** | A short list of what you offer | Typed into the code **[developer]** |
| **Calculator** | A small SIP calculator | Runs in the visitor's browser; nothing is saved |
| **Insights and Perspectives** | The three newest published insights, with picture, title and summary | Database **[admin]**: Admin → Insights. The section hides itself if nothing is published |
| **Contact** | Address, phone, email and the enquiry form | Contact details are typed into the code **[developer]**; the form is explained in guide 06 |

### Logic worth knowing
- **FAQ box:** questions appear in the order set in the admin panel. Hidden questions do not show. A "book a consultation" link is added to every answer automatically.
- **Insights section:** newest first by publish date. Click through opens the full article.
- **Calculator:** the SIP formula is in guide 05.

### Things still showing placeholder text (please give us the real details)
- Assets under management ("₹250Cr+ … Placeholder"), years of experience, families served.
- Trust bar: "AMFI Registered (Fake ARN-123456)", "SEBI Reg. Placeholder", "BSE Star MF Partner", "ISO 9001:2015". Please confirm which are true and send the real ARN.
- The footer disclaimer also shows the placeholder ARN.
- Phone number (+91 98765 43210), email (info@knowithcapital.demo) and the WhatsApp button number. All three look fake.
- Testimonials are generic. Please confirm they are real, with permission to publish, or tell us to remove them.

## Approach, Services, About and Why Choose Us

- **What they show:** the philosophy, the three pillars (core, consistent, contrarian), quantitative and qualitative method, the services list and the reasons to choose Knowith.
- **Where it comes from:** all of the wording is typed into the code **[developer]**. To change a sentence, send us the new text.
- **Stored:** nothing about visitors is stored by these pages.
- **Logic:** none. They are static pages.

## The footer

- **Shows:** logo, a short description, links (Services, Company, Legal), the regulatory disclaimer and copyright.
- **Where it comes from:** typed into the code **[developer]**.
- **Pending:** the Terms, Privacy and Disclaimer pages need your final legal text (see "Legal text" below), and the planned Forms section needs your forms.

### Legal text
You sent three documents (Terms of service, Privacy policy, Disclaimer). They are written for **FundzBazar / Prudent Corporate Advisory Services**, mention Prudent's ARN and describe collecting PAN, date of birth and bank details, which this website does not do. We will not publish them unchanged. We need either Knowith-specific versions or a clear statement that they apply to the FundzBazar platform, plus a short notice for this website.
