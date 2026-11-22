'use client';

import { upload } from '@vercel/blob/client';

let modePromise: Promise<'cloudinary' | 'r2' | 'blob' | 'local'> | null = null;

/**
 * Uploads a public file (insight PDF or image) from the browser and returns its public URL.
 *   • Cloudinary or Cloudflare R2: the server issues a one-time signed upload and the browser sends the file straight to storage.
 *   • Vercel Blob (legacy): client upload.
 *   • Local development: a plain multipart POST.
 */
export async function uploadFile(file: File, folder = 'uploads'): Promise<string> {
  modePromise ??= fetch('/api/v1/uploads').then(r => r.json()).then(d => d.mode);
  const mode = await modePromise;

  if (mode === 'cloudinary' || mode === 'r2') {
    const res = await fetch('/api/v1/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size, folder }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Could not start the upload');
    if (json.mode === 'cloudinary') {
      const form = new FormData();
      for (const [k, v] of Object.entries(json.fields as Record<string, string>)) form.append(k, v);
      form.append('file', file);
      const up = await fetch(json.uploadUrl, { method: 'POST', body: form });
      const out = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(out?.error?.message || `Upload to storage failed (${up.status})`);
      return out.secure_url as string;
    }
    const put = await fetch(json.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!put.ok) throw new Error(`Upload to storage failed (${put.status}). Check the storage bucket's CORS settings.`);
    return json.publicUrl;
  }

  if (mode === 'blob') {
    const name = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blob = await upload(`${folder}/${name}`, file, {
      access: 'public',
      handleUploadUrl: '/api/v1/uploads',
      multipart: file.size > 5 * 1024 * 1024,
    });
    return blob.url;
  }

  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/v1/uploads', { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Upload failed');
  return json.url;
}
