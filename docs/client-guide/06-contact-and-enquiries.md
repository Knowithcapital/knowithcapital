# 06 — Contact, enquiries and the chat assistant

Covers the **Contact / Book a Consultation** page (`/contact`), the enquiry form at the bottom of the home page, and the **chat assistant** button that floats at the bottom-left of every page.

## The enquiry form (Contact page and home page)

**What visitors see:** three buttons for the reason: **Portfolio review**, **General inquiry**, **General assistance**, then name, email, phone (optional) and a message.

**What happens when they press Send**
1. The form is sent to **Web3Forms**, an outside form service.
2. Web3Forms emails the enquiry to the mailbox registered against our form key. The email subject shows the reason, for example "New portfolio review request".
3. The visitor sees a thank-you message: "A Knowith Capital wealth manager will contact you shortly."

**Where it is stored:** the enquiry is **not saved in the website database.** It exists as an email in the receiving mailbox, and in Web3Forms' own records. This means:
- **You must watch that mailbox.** There is no enquiries list in the admin panel.
- **Action needed:** once the company mailbox is created, the form's receiving address must be changed to it. Today it goes to whichever address the form key was created with.

**Portfolio review:** when a visitor chooses it, the form tells them we will need their fund names, ISINs and units. Today a person handles this by email. The process for non-clients (automatic reply asking for details, generating a report, and so on) is still to be decided with you.

**Logic:** none beyond requiring a reason, name and email. Phone and message are optional.

## The chat assistant (the round button at the bottom-left)

**What visitors see:** a chat window where an AI assistant answers questions about Knowith, mutual funds and the services, and can pass someone to a human.

**How it works [AI]**
1. The visitor's message and the conversation so far go to the AI (Google Gemini).
2. The AI first works out what the visitor wants: a general question, someone interested in becoming a client, a request for a human, or a compliance-sensitive question.
3. For general questions it answers from a **knowledge file** about Knowith and from general financial education. Compliance-sensitive questions get a careful, standard answer.
4. If the visitor looks like a prospect, the assistant politely collects **name, email, phone, city and rough investment amount**, step by step, over the conversation.
5. If the visitor wants a human, it collects their details and records a hand-off request.

**Where it is stored**

| What | Where |
|---|---|
| The conversation (visitor messages and replies) | Website database, in the chat sessions |
| Contact details the visitor gave | Website database, as one **lead** per conversation, with a short summary |
| The knowledge the assistant answers from | A file in the website's code **[developer]** |

**Where you see it**
- **Admin → Chat Logs:** every conversation across the assistant and the research tools, searchable by name, email or message text, with the collected details.
- **Admin → Leads:** the captured leads (available at `/admin/leads`; it is not in the side menu).

**Things to know**
- The assistant is an AI. It can make mistakes, and it is not a substitute for your advice. Review Chat Logs regularly in the first weeks after launch.
- Visitors are not asked to sign in to use it, so their identity is only what they choose to type.
