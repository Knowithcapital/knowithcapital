# File storage setup — Cloudflare R2 (alternative)

> **The website now uses Cloudinary by default** (see [storage-setup-cloudinary.md](storage-setup-cloudinary.md)). Cloudinary's Free plan caps files at 10 MB. Use this R2 setup instead if you need larger portfolio PDFs: remove the `CLOUDINARY_URL` variable and set the `R2_*` variables below.

The website can keep uploaded files in Cloudflare R2 (an S3-compatible bucket). It uses **two buckets**:

| Bucket | Holds | Access |
|---|---|---|
| **Public** (for example `knowith-public`) | Insight PDFs, cover images, charts cut from PDFs | Anyone with the link, through a public address |
| **Private** (for example `knowith-private`) | Client portfolio report PDFs | **No public access at all.** The website hands out a one-minute signed link only after it has checked who is asking |

Do not put client reports in the public bucket.

## 1. Create the buckets

In the Cloudflare dashboard → **R2 Object Storage** → **Create bucket**, twice.

**Public bucket:** after creating it, open **Settings → Public access** and either
- connect a **custom domain** such as `files.knowithcapital.com` (recommended), or
- turn on the **r2.dev subdomain** (fine for testing).
Note the resulting address; it is `R2_PUBLIC_URL` below.

**Private bucket:** leave public access **off**. Do not connect a domain.

## 2. Create an access key

R2 → **Manage R2 API Tokens** → **Create API token**:
- Permission: **Object Read & Write**.
- Scope: both buckets only.
Copy the **Access Key ID**, **Secret Access Key** and your **Account ID** (shown on the R2 overview page).

## 3. Allow uploads from the website (CORS)

Files go from the admin's browser **straight to R2** (the PDFs are too large for the website server). R2 must therefore allow the website's address. On **each bucket** → **Settings → CORS policy**, paste:

```json
[
  {
    "AllowedOrigins": ["https://knowithcapital.com", "https://www.knowithcapital.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

For local testing also add `http://localhost:3000` to `AllowedOrigins`. The **public** bucket also needs `"GET"` in `AllowedMethods` if the website will read its files from the browser (images normally load without CORS, so this is usually not needed).

The **private** bucket never needs `GET` in CORS: reports are opened through a redirect from the website.

## 4. Set the environment variables

In Vercel → the project → **Settings → Environment Variables** (Production), and in `.env.local` for local work:

| Variable | Value |
|---|---|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | The access key ID from step 2 |
| `R2_SECRET_ACCESS_KEY` | The secret access key from step 2 |
| `R2_PUBLIC_BUCKET` | Name of the public bucket |
| `R2_PUBLIC_URL` | Public address of that bucket, no trailing slash, e.g. `https://files.knowithcapital.com` |
| `R2_PRIVATE_BUCKET` | Name of the private bucket |

Redeploy after adding them. Never commit these values to the repository.

## 5. Check it works

1. **Admin → Insights**: upload a PDF. The upload should complete and the article should convert.
2. **Admin → Portfolio Reports**: upload a sample PDF for a test client, sign in as that client (login page → Your portfolio) and open **My Portfolio**. View it and download it.
3. Upload a second PDF for the same client. The previous file should disappear from the private bucket (check **R2 → bucket → Objects**).

If an upload stops with "Upload to storage failed", the CORS policy on that bucket is missing or does not list the website's address.

## How it behaves

- **One report per client.** A new upload replaces the old record and the old PDF is deleted from the private bucket. Removing a client from Client Access also deletes their PDF.
- **Size limit:** portfolio PDFs up to 60 MB; insight files up to 30 MB.
- **Private links expire after one minute.** Opening the report again fetches a fresh link.
- **Older insight files** that were saved earlier on Vercel Blob keep working; only new uploads go to R2.
- **If R2 is not configured:** in local development files are kept on disk (`public/uploads` and `private-uploads`, neither is committed). On the live site, uploads are switched off and the admin page says so.
