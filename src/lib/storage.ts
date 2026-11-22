import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { put, del } from '@vercel/blob';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CLOUDINARY_FREE_MAX_BYTES, cloudinaryBytes, cloudinaryDestroy, cloudinaryDownloadUrl, cloudinaryEnabled,
  cloudinaryUpload, parseCloudinaryUrl, resourceFor, signedUpload,
} from '@/lib/cloudinary';

// ────────────────────────────────────────────────────────────────
// File storage.
//
// Two kinds of files:
//   • PUBLIC  — insight PDFs, cover images and figures. Anyone can open them by URL.
//   • PRIVATE — client portfolio reports. Never public: they are only handed out
//     through short-lived signed links after the app has checked who is asking.
//
// Backends, in order of preference:
//   0. Cloudinary — set CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
//        Public files use delivery type "upload"; private files use "authenticated" (no public
//        address; read only through signed requests made by this server). The free plan caps
//        each file at 10 MB.
//   1. Cloudflare R2 (S3-compatible)  — set the R2_* variables below.
//        R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
//        R2_PUBLIC_BUCKET + R2_PUBLIC_URL   → public files (R2_PUBLIC_URL is the bucket's public
//                                              address, e.g. https://files.knowithcapital.com)
//        R2_PRIVATE_BUCKET                  → private files (no public access on this bucket)
//   2. Vercel Blob (public files only, legacy) — BLOB_READ_WRITE_TOKEN
//   3. Local disk, development only: public/uploads (public) and private-uploads (private)
//
// Existing insight files that were saved to Vercel Blob keep working.
// ────────────────────────────────────────────────────────────────

const env = (name: string) => process.env[name]?.trim() || '';

const r2Credentials = () => Boolean(env('R2_ACCOUNT_ID') && env('R2_ACCESS_KEY_ID') && env('R2_SECRET_ACCESS_KEY'));
export const r2PublicEnabled = () => r2Credentials() && Boolean(env('R2_PUBLIC_BUCKET') && env('R2_PUBLIC_URL'));
export const r2PrivateEnabled = () => r2Credentials() && Boolean(env('R2_PRIVATE_BUCKET'));
export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const isProdHost = () => Boolean(process.env.VERCEL && process.env.NODE_ENV === 'production');

let s3: S3Client | null = null;
function client(): S3Client {
  s3 ??= new S3Client({
    region: 'auto',
    endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY') },
    // R2 does not accept the extra checksum headers newer SDK versions add by default
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return s3;
}

const publicBase = () => env('R2_PUBLIC_URL').replace(/\/+$/, '');

const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads');
const PRIVATE_LOCAL_DIR = path.join(process.cwd(), 'private-uploads');

export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(-120);
}

// ── Public files ────────────────────────────────────────────────

/** Which backend public uploads use right now. */
export function publicStorageMode(): 'cloudinary' | 'r2' | 'blob' | 'local' {
  if (cloudinaryEnabled()) return 'cloudinary';
  if (r2PublicEnabled()) return 'r2';
  if (blobEnabled()) return 'blob';
  return 'local';
}

/** "insights/report.pdf" → "insights/report-1a2b3c4d.pdf" (a random suffix stops files overwriting each other). */
function publicKey(pathname: string): string {
  const clean = pathname.replace(/^\/+/, '').replace(/[^a-zA-Z0-9/._-]/g, '_');
  const dot = clean.lastIndexOf('.');
  const suffix = `-${randomUUID().slice(0, 8)}`;
  return dot > clean.lastIndexOf('/') ? `${clean.slice(0, dot)}${suffix}${clean.slice(dot)}` : `${clean}${suffix}`;
}

/** Saves a public file from the server and returns its public URL. */
export async function saveFile(pathname: string, data: Buffer | ArrayBuffer, contentType: string): Promise<string> {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (cloudinaryEnabled()) {
    const resource = resourceFor(contentType);
    const key = publicKey(pathname);
    // Image public ids carry no extension; raw ones (PDFs) keep theirs
    const publicId = resource === 'image' ? key.replace(/\.[A-Za-z0-9]+$/, '') : key;
    const out = await cloudinaryUpload(body, { resource, type: 'upload', publicId, mime: contentType, fileName: path.basename(key) });
    return out.secureUrl;
  }
  if (r2PublicEnabled()) {
    const key = publicKey(pathname);
    await client().send(new PutObjectCommand({ Bucket: env('R2_PUBLIC_BUCKET'), Key: key, Body: body, ContentType: contentType }));
    return `${publicBase()}/${key}`;
  }
  if (blobEnabled()) {
    const blob = await put(pathname, body, { access: 'public', contentType, addRandomSuffix: true });
    return blob.url;
  }
  if (isProdHost()) {
    throw new Error('File storage is not configured. Set the Cloudflare R2 variables (R2_*) on the project.');
  }

  const fileName = `${Date.now()}-${safeFileName(pathname.replace(/\//g, '-'))}`;
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, fileName), body);
  return `/uploads/${fileName}`;
}

/** A one-time link the browser can PUT a public file to directly (keeps big files off the app server). */
export type PublicUpload =
  | { mode: 'r2'; uploadUrl: string; publicUrl: string }
  | { mode: 'cloudinary'; uploadUrl: string; fields: Record<string, string> };

export async function createPublicUpload(folder: string, fileName: string, contentType: string): Promise<PublicUpload> {
  const key = publicKey(`${folder}/${safeFileName(fileName)}`);
  if (cloudinaryEnabled()) {
    const resource = resourceFor(contentType);
    const publicId = resource === 'image' ? key.replace(/\.[A-Za-z0-9]+$/, '') : key;
    return { mode: 'cloudinary', ...signedUpload(resource, 'upload', publicId) };
  }
  const uploadUrl = await getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: env('R2_PUBLIC_BUCKET'), Key: key, ContentType: contentType }),
    { expiresIn: 600 },
  );
  return { mode: 'r2', uploadUrl, publicUrl: `${publicBase()}/${key}` };
}

/** True only for files held in our own storage (guards server-side fetches). */
export function isStoredFileUrl(url: string): boolean {
  if (/^\/uploads\/[^/]+$/.test(url)) return true;
  if (cloudinaryEnabled() && parseCloudinaryUrl(url)?.type === 'upload') return true;
  if (r2PublicEnabled() && url.startsWith(`${publicBase()}/`)) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/** Reads a stored public file back (R2 / Blob URL or local /uploads path). */
export async function readFile(url: string): Promise<Buffer> {
  if (!isStoredFileUrl(url)) throw new Error('File is not in this site\'s storage');
  if (url.startsWith('/uploads/')) {
    return fs.readFile(path.join(LOCAL_DIR, path.basename(url)));
  }
  // Cloudinary accounts block public delivery of PDFs by default; a signed server-side request still works
  const cld = cloudinaryEnabled() ? parseCloudinaryUrl(url) : null;
  const target = cld ? cloudinaryDownloadUrl(cld.publicId, cld.type, cld.resource) : url;
  const res = await fetch(target, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not download ${url} (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Best-effort delete of public files; never throws. */
export async function deleteFiles(urls: (string | null | undefined)[]): Promise<void> {
  for (const url of urls) {
    if (!url) continue;
    try {
      if (url.startsWith('/uploads/')) {
        await fs.unlink(path.join(LOCAL_DIR, path.basename(url)));
      } else if (cloudinaryEnabled() && parseCloudinaryUrl(url)) {
        const c = parseCloudinaryUrl(url)!;
        await cloudinaryDestroy(c.publicId, c.type, c.resource);
      } else if (r2PublicEnabled() && url.startsWith(`${publicBase()}/`)) {
        const key = decodeURIComponent(url.slice(publicBase().length + 1));
        await client().send(new DeleteObjectCommand({ Bucket: env('R2_PUBLIC_BUCKET'), Key: key }));
      } else if (blobEnabled() && url.includes('.blob.vercel-storage.com')) {
        await del(url);
      }
    } catch {
      // already gone
    }
  }
}

// ── Private files (client portfolio reports) ────────────────────

/** Which backend private files use right now. "none" means the host has no private storage configured. */
export function privateStorageMode(): 'cloudinary' | 'r2' | 'local' | 'none' {
  if (cloudinaryEnabled()) return 'cloudinary';
  if (r2PrivateEnabled()) return 'r2';
  return isProdHost() ? 'none' : 'local';
}

/** Keys we create look like portfolio/<uuid>.pdf; anything else is refused. */
export const newPortfolioKey = () => `portfolio/${randomUUID()}.pdf`;
export const isPortfolioKey = (key: unknown): key is string =>
  typeof key === 'string' && /^portfolio\/[0-9a-f-]{36}\.pdf$/.test(key);

const localPrivatePath = (key: string) => path.join(PRIVATE_LOCAL_DIR, path.basename(key));

/** Largest portfolio PDF the current private storage accepts. */
export function privateMaxBytes(): number {
  return privateStorageMode() === 'cloudinary' ? CLOUDINARY_FREE_MAX_BYTES : 60 * 1024 * 1024;
}

export type PrivateUpload =
  | { mode: 'r2'; uploadUrl: string }
  | { mode: 'cloudinary'; uploadUrl: string; fields: Record<string, string> };

/** What the browser needs to send a PDF straight to private storage (keeps big files off the app server). */
export async function createPrivateUpload(key: string): Promise<PrivateUpload> {
  if (privateStorageMode() === 'cloudinary') {
    return { mode: 'cloudinary', ...signedUpload('raw', 'authenticated', key) };
  }
  const uploadUrl = await getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: env('R2_PRIVATE_BUCKET'), Key: key, ContentType: 'application/pdf' }),
    { expiresIn: 600 },
  );
  return { mode: 'r2', uploadUrl };
}

/** Saves a private file from the server (local development only; production uses direct R2 uploads). */
export async function savePrivateLocal(key: string, data: Buffer): Promise<void> {
  await fs.mkdir(PRIVATE_LOCAL_DIR, { recursive: true });
  await fs.writeFile(localPrivatePath(key), data);
}

/** Size and first bytes of a stored private file, or null if it is missing. */
export async function inspectPrivate(key: string): Promise<{ size: number; head: string } | null> {
  try {
    if (privateStorageMode() === 'cloudinary') {
      const size = await cloudinaryBytes(key, 'authenticated', 'raw');
      if (size === null) return null;
      const first = await fetch(cloudinaryDownloadUrl(key, 'authenticated'), { headers: { Range: 'bytes=0-4' }, cache: 'no-store' });
      const bytes = Buffer.from(await first.arrayBuffer()).subarray(0, 5);
      return { size, head: bytes.toString('latin1') };
    }
    if (privateStorageMode() === 'r2') {
      const meta = await client().send(new HeadObjectCommand({ Bucket: env('R2_PRIVATE_BUCKET'), Key: key }));
      const first = await client().send(new GetObjectCommand({ Bucket: env('R2_PRIVATE_BUCKET'), Key: key, Range: 'bytes=0-4' }));
      const bytes = first.Body ? Buffer.from(await first.Body.transformToByteArray()) : Buffer.alloc(0);
      return { size: meta.ContentLength ?? 0, head: bytes.toString('latin1') };
    }
    const file = localPrivatePath(key);
    const stat = await fs.stat(file);
    const handle = await fs.open(file, 'r');
    const buf = Buffer.alloc(5);
    await handle.read(buf, 0, 5, 0);
    await handle.close();
    return { size: stat.size, head: buf.toString('latin1') };
  } catch {
    return null;
  }
}

/** The stored private file as a response from Cloudinary (the caller streams it on to the signed-in client). */
export async function fetchPrivateFromCloudinary(key: string): Promise<Response> {
  return fetch(cloudinaryDownloadUrl(key, 'authenticated'), { cache: 'no-store' });
}

/** Reads a private file into memory (local development only). */
export async function readPrivateLocal(key: string): Promise<Buffer> {
  return fs.readFile(localPrivatePath(key));
}

/**
 * A signed link, valid for one minute, to open or download a private file.
 * The app only hands this out after checking the caller may see that file.
 */
export async function privateFileUrl(key: string, fileName: string, download: boolean): Promise<string> {
  const safe = safeFileName(fileName) || 'report.pdf';
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: env('R2_PRIVATE_BUCKET'),
      Key: key,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: `${download ? 'attachment' : 'inline'}; filename="${safe}"`,
    }),
    { expiresIn: 60 },
  );
}

/** Best-effort delete of a private file; never throws. */
export async function deletePrivate(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    if (privateStorageMode() === 'cloudinary') {
      await cloudinaryDestroy(key, 'authenticated', 'raw');
    } else if (privateStorageMode() === 'r2') {
      await client().send(new DeleteObjectCommand({ Bucket: env('R2_PRIVATE_BUCKET'), Key: key }));
    } else {
      await fs.unlink(localPrivatePath(key));
    }
  } catch {
    // already gone
  }
}
