# 04 — Quiz (investor games)

The **Quiz** page (`/games`) is a set of short games that teach investing lessons. Each chapter gives a score, and the scores add up to a total. Completing every chapter unlocks an investor profile.

## The chapters

| # | Game | What it teaches |
|---|---|---|
| 1 | Season Survivor | Holding through down years: 10 years, one decision a year |
| 2 | Sequence Shuffle | Why the order of returns matters |
| 3 | The Panic Room | Whether to sell in six real crises, 12 seconds each |
| 4 | Unit Rapid Fire | Market mechanics: 10 questions, 15 seconds each |
| 5 | The Contrarian Signal | Reading extreme headlines and what happened next |
| 6 | Freedom Stack | Sorting financial situations into five pillars in 120 seconds |
| 7 | The Market Cap Challenge | A 20-year memory game on which cap size won each year |
| 8 | Match the Performers | Past returns versus forecasts, and why leaders do not always repeat |
| 9 | Global Asset Allocator | Placing a virtual ₹10 lakh across India, US, developed and emerging markets over six rounds |

## Where the content comes from

- **All questions, headlines, return tables and lessons are typed into the website's code [developer].** They are not fetched live and are not calculated from market feeds. The return tables in chapters 7 and 8 and the 2000–2025 country returns in chapter 9 are fixed figures.
- Chapter 9 is a self-contained game page shown inside the Quiz page.
- To change a question, headline or lesson, send the new text to the developer. We still need your **quiz content updates**.

## Scores and the leaderboard

- **Your score during a visit** is kept in the visitor's own browser for that visit only. Closing the tab resets it.
- **Leaderboard:** when someone finishes and enters a name, their **name and total score** are saved in the website database. The leaderboard shows the top ten. A name that plays again has its score replaced rather than added.
- **No sign-in is needed to play, and no email or phone is collected.**

## What you control

- **Admin → Games config** lets you switch each chapter on or off. A switched-off chapter disappears from the Quiz page. If nothing has ever been saved there, all nine chapters show.
- You cannot edit the questions from the admin panel.

## How a game's result is decided (examples)

- **Chapter 9:** each of the six rounds shows annual returns for four baskets over a hidden period. The visitor chooses one basket, then the next year's actual return is revealed. The game compares the visitor's choice with the best basket, an equal split across all four, and the best possible choice in hindsight. The end screen shows the visitor's hit rate and a heat map of 2000–2025 country returns.
