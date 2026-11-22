# 03 — Insights and Perspectives

Covers the **Insights** page (`/insights`), each **article page**, and the **Insights and Perspectives** strip on the home page. You manage all of it in **Admin → Insights**.

## What visitors see

- **Home page:** the three newest published insights, each with a picture, title and short summary. The section is hidden until something is published.
- **Insights page:** a picture carousel at the top for **infographics**, and below it a library of **research reports and articles** as cards with date and a "Read" link.
- **Article page:** a clean, magazine-style article with a table of contents, key takeaways, charts and tables, and a **Download PDF** button, so readers can also save or share the original.

## The three kinds of insight

| Kind | What you do | What visitors get |
|---|---|---|
| **PDF Report** (recommended) | Upload a PDF. You can create it with ChatGPT, Gemini or Word and export to PDF | An article layout built from the PDF, plus the original PDF to download |
| **Written Article** | Type in the editor in the admin panel, optionally add a cover image | A normal article page |
| **Infographic** | Upload an image | The image appears in the carousel at the top of the Insights page |

## How a PDF becomes an article [AI]

1. You upload the PDF in Admin → Insights. The PDF is saved in the website's file storage.
2. The website turns each PDF page into an image and gives them to the AI (Google Gemini), which reads the text, tables and charts.
3. The AI returns a structured article: headings, paragraphs, key takeaways, callout boxes, tables, and the charts or pictures **cropped out of your PDF**. The cropped images are saved in file storage.
4. The cover picture defaults to the first picture in the article. You can upload a separate cover.
5. The result is saved as a **draft**, which visitors cannot see yet. You preview it, edit the title and summary if you want, and then **publish**. Un-publishing hides it again without deleting it.
6. Converting takes about one to two minutes for a multi-page PDF.

**What to check before publishing:** the article text and numbers are read from your PDF by an AI, so look at tables and charts once. If the layout is wrong, re-upload or re-convert, or fix the text in the editor.

## Where everything is stored

| Item | Where |
|---|---|
| Title, summary, type, publish date, published or draft, the structured article | Website database (the insights table) |
| The PDF, cover image, cropped charts, infographic images | Public file storage (Cloudinary). Pictures only show if file storage is connected; if charts or images are missing, tell the developer |
| Who can see it | Anyone, once published. Drafts are visible only to admins |

## Logic and ordering

- **Order:** newest publish date first on the home page and the Insights page.
- **Homepage strip:** shows the three newest published items of any type.
- **Report and article cards** use the date you published; infographics go to the carousel, not the card list.
- **Download PDF** gives the original uploaded PDF unchanged, served through the website.

## Limits

- One PDF at a time; very large PDFs may take longer to convert.
- The AI reads the PDF as images, so scanned or low-quality PDFs convert less accurately.
- Taxation write-up: when you send your text and tables, upload them the same way (as a PDF or a written article).
