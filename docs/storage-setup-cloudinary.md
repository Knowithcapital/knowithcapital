# File storage setup — Cloudinary

The website keeps uploaded files in **Cloudinary**. One account holds two kinds of file:

| Kind | Holds | How it is stored |
|---|---|---|
| **Public** | Insight PDFs, cover images, charts cut out of PDFs | Delivery type `upload`: anyone with the link can open the image. PDFs are handed out through the website's own "Download PDF" link, so they work even though Cloudinary blocks direct public links to PDFs by default |
| **Private** | Client portfolio report PDFs | Delivery type `authenticated`: **no public address at all.** Only the website's server can read them, after it has checked which client is signed in. Opening an unsigned link returns 401 |

## 1. Connect it

Set one environment variable, in **Vercel → Project → Settings → Environment Variables** (Production) and in `.env.local` for local work:

```
CLOUDINARY_URL=cloudinary://<API key>:<API secret>@<cloud name>
```

(Or the three separate variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.)
The values are on the Cloudinary dashboard under **Settings → API Keys** (the cloud name is at the top of the dashboard). Redeploy after adding the variable. Never commit it to the repository.

No CORS or bucket settings are needed: the browser uploads straight to Cloudinary with a signature the website creates for each upload.

> **Keep the API secret private.** If it has been pasted in a chat or email, generate a new one (Settings → API Keys → Generate new API key) and update the variable.

## 2. The file size limit (important)

The **Free plan accepts files up to 10 MB** (this was confirmed with a test upload). A larger file is rejected.
- The sample "Investment Snapshot" report is about **15 MB, so it will not upload on the Free plan.**
- Options: compress the PDF below 10 MB before uploading (the admin page checks and says so), move to a paid Cloudinary plan with a higher limit, or use Cloudflare R2 for the private reports instead (see [storage-setup-r2.md](storage-setup-r2.md); R2 is used automatically for private files if the Cloudinary variable is removed and the `R2_*` variables are set).
- The admin page reads the current limit from the website and shows it, so it stays correct if the plan or the storage changes.

## 3. How it behaves

- **One report per client.** A new upload replaces the client's record and the old PDF is deleted from Cloudinary. Removing a client from Client Access also deletes their PDF.
- **Clients open the PDF through the website**, which streams it from Cloudinary after checking the signed-in client. The Cloudinary address is never shown to the client.
- **Insight "Download PDF"** is served through `/api/v1/insights/<id>/pdf`; drafts are visible to admins only.
- **Older insight files** that were saved earlier on Vercel Blob keep working; only new uploads go to Cloudinary.
- **Not configured:** in local development files are kept on disk (`public/uploads`, `private-uploads`; neither is committed). On the live site uploads are switched off and the admin pages say so.

## 4. Check it works

1. **Admin → Insights:** upload a PDF. It should upload and convert, and the article's **Download PDF** button should open the PDF.
2. **Admin → Portfolio Reports:** upload a PDF under 10 MB for a test client, sign in as that client (login page → Your portfolio), open **My Portfolio**, view it and download it.
3. Upload a second PDF for the same client and confirm the first is gone (Cloudinary → Media Library → the `portfolio` folder).
4. In a private browser window, open the Cloudinary address of a report: it must show an error, not the PDF.
