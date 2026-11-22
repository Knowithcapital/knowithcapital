import crypto from 'crypto';

// ────────────────────────────────────────────────────────────────
// Cloudinary REST helpers (no SDK needed). Used by lib/storage.ts.
//
// Configure with the standard single variable
//     CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
// or with CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.
//
// Public files (insight images and PDFs) are stored with type "upload".
// Private files (client portfolio reports) are stored with type "authenticated": they have no
// public address and can only be read with a signed request made by the server.
// ────────────────────────────────────────────────────────────────

export interface CloudinaryConfig { cloud: string; key: string; secret: string }

/** Free plan limit per file. Larger files are rejected by Cloudinary, so we say so up front. */
export const CLOUDINARY_FREE_MAX_BYTES = 10 * 1024 * 1024;

export function cloudinaryConfig(): CloudinaryConfig | null {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url);
    if (m) return { key: m[1], secret: m[2], cloud: m[3] };
  }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  return cloud && key && secret ? { cloud, key, secret } : null;
}

export const cloudinaryEnabled = () => cloudinaryConfig() !== null;

const cfg = () => {
  const c = cloudinaryConfig();
  if (!c) throw new Error('Cloudinary is not configured');
  return c;
};

type Params = Record<string, string | number>;

function sign(params: Params): string {
  const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(toSign + cfg().secret).digest('hex');
}

export type CloudinaryResource = 'image' | 'raw';
export type CloudinaryType = 'upload' | 'authenticated';

/** PDFs go in as "raw" files; images as "image". */
export const resourceFor = (mime: string): CloudinaryResource => (mime.startsWith('image/') ? 'image' : 'raw');

/** Where a browser should POST a signed upload, and the form fields to send with the file. */
export function signedUpload(resource: CloudinaryResource, type: CloudinaryType, publicId: string): { uploadUrl: string; fields: Record<string, string> } {
  const { cloud, key } = cfg();
  const params: Params = { timestamp: Math.floor(Date.now() / 1000), public_id: publicId, type };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloud}/${resource}/upload`,
    fields: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: key, signature: sign(params) },
  };
}

/** Uploads a file from the server. */
export async function cloudinaryUpload(
  data: Buffer,
  opts: { resource: CloudinaryResource; type: CloudinaryType; publicId: string; mime: string; fileName: string },
): Promise<{ secureUrl: string; publicId: string; bytes: number }> {
  const { fields, uploadUrl } = signedUpload(opts.resource, opts.type, opts.publicId);
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('file', new Blob([new Uint8Array(data)], { type: opts.mime }), opts.fileName);
  const res = await fetch(uploadUrl, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Cloudinary upload failed (${res.status})`);
  return { secureUrl: json.secure_url, publicId: json.public_id, bytes: json.bytes };
}

/** Deletes an asset. Never throws. */
export async function cloudinaryDestroy(publicId: string, type: CloudinaryType, resource: CloudinaryResource): Promise<void> {
  try {
    const { cloud, key } = cfg();
    const params: Params = { timestamp: Math.floor(Date.now() / 1000), public_id: publicId, type, invalidate: 'true' };
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) form.append(k, String(v));
    form.append('api_key', key);
    form.append('signature', sign(params));
    await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resource}/destroy`, { method: 'POST', body: form });
  } catch {
    // already gone
  }
}

/**
 * A signed, expiring link that returns the file's bytes (works for authenticated files and for
 * public PDFs even when the account blocks public PDF delivery). Only ever used server-side.
 */
export function cloudinaryDownloadUrl(publicId: string, type: CloudinaryType, resource: CloudinaryResource = 'raw', ttlSeconds = 120): string {
  const { cloud, key } = cfg();
  const params: Params = { public_id: publicId, type, expires_at: Math.floor(Date.now() / 1000) + ttlSeconds, timestamp: Math.floor(Date.now() / 1000) };
  return `https://api.cloudinary.com/v1_1/${cloud}/${resource}/download?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: key, signature: sign(params) })}`;
}

/** Size in bytes of a stored asset, or null if it does not exist. */
export async function cloudinaryBytes(publicId: string, type: CloudinaryType, resource: CloudinaryResource): Promise<number | null> {
  const { cloud, key, secret } = cfg();
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${resource}/${type}/${publicId}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = await res.json();
  return typeof json.bytes === 'number' ? json.bytes : null;
}

/** Splits a Cloudinary delivery URL of ours into the pieces the API needs. */
export function parseCloudinaryUrl(url: string): { resource: CloudinaryResource; type: CloudinaryType; publicId: string } | null {
  const c = cloudinaryConfig();
  if (!c) return null;
  const m = new RegExp(`^https://res\\.cloudinary\\.com/${c.cloud}/(image|raw)/(upload|authenticated)/(?:v\\d+/)?(.+)$`).exec(url);
  if (!m) return null;
  const resource = m[1] as CloudinaryResource;
  let publicId = decodeURIComponent(m[3].split('?')[0]);
  // Image URLs end in the file extension, which is not part of the image's public id
  if (resource === 'image') publicId = publicId.replace(/\.[A-Za-z0-9]+$/, '');
  return { resource, type: m[2] as CloudinaryType, publicId };
}

export const isCloudinaryUrl = (url: string): boolean => parseCloudinaryUrl(url) !== null;
