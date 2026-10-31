# 05 — Calculators

The **Calculators** page (`/calculators`) has eight tools. Seven are plain maths that run **inside the visitor's browser**: nothing a visitor types is sent to us or saved. The eighth, the Narrative Planner, uses the AI to read a sentence and fill in the numbers.

**Where the numbers come from:** only from what the visitor enters and from default assumptions (expected return, inflation, and so on) that visitors can change with sliders. There is no market data. The defaults are typed into the code **[developer]**.

| Calculator | What it answers | The logic |
|---|---|---|
| **Narrative Planner** | "Tell us your story and we map your future" | The AI reads free text such as "I want 50 lakh in 8 years" and extracts: existing savings, monthly savings, goal, years and expected return (12% if you do not say). If you give a goal and a time but no monthly amount, it estimates the monthly amount. The tool then does the same maths as the SIP calculator. If the text is too vague it asks a question instead |
| **Smart SIP** | What a monthly SIP grows to, and the cost of delay | Future value of equal monthly investments at the start of each month: `P × ((1+i)^n − 1) ÷ i × (1+i)`, where P is the monthly amount, i the monthly return (yearly ÷ 12) and n the number of months. The cost of delay is the difference between starting now and starting after the chosen number of months |
| **Step-up SIP** | A SIP that increases every year | Each year's monthly amount is the previous year's plus the step-up percentage. Each year's instalments are grown to year end and added to the running total, which grows at the yearly return |
| **Lump sum** | What a one-time investment grows to | `Amount × (1 + yearly return)^years` |
| **EMI** | Monthly instalment, total interest, where the payments go | `Loan × r × (1+r)^n ÷ ((1+r)^n − 1)` with r the monthly rate and n the months. With a 0% rate it is simply the loan divided by the months |
| **SWP** | How long a corpus lasts under monthly withdrawals | Month by month: add the month's return to the balance, then subtract the withdrawal. If the balance runs out it stops and says the corpus is depleted |
| **Early loan closure** | Interest and time saved by paying extra every month | Calculates the normal EMI, then repeats month by month with EMI plus the extra amount until the loan is cleared. Interest saved is the normal total interest minus the interest actually paid |
| **F.I.R.E.** | The corpus needed to retire early and the SIP to get there | Expense at retirement = today's monthly expense × (1 + inflation)^years. Corpus needed = that year's expense ÷ (post-retirement return − inflation). If that real return is zero or negative it falls back to 33 times the annual expense (a 3% withdrawal rate). Required SIP is worked out from the corpus, the years left and the pre-retirement return |

## Stored

- **Calculator inputs and results are not stored anywhere.**
- The **Narrative Planner** sends the visitor's sentence to Google's Gemini AI to read it. The sentence is not saved by the website.

## Things to know

- Results are estimates based on the assumptions entered, not forecasts. Pages note their assumptions and invite visitors to speak to the team.
- Monthly calculations assume investment at the start of the month and a constant return.
- The old "Narrative & Numbers" card (business valuation) pointed to a page that does not exist, so it was removed from the list.
