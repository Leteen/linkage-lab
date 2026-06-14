import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: 'Sharing not configured — add BLOB_READ_WRITE_TOKEN to Vercel env vars.' },
      { status: 503 },
    );
  }
  if (!process.env.KV_REST_API_URL) {
    return Response.json(
      { error: 'Sharing not configured — add Upstash Redis (KV) to the Vercel project.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const configJson = form.get('config');
  const imageFile = form.get('image');
  if (typeof configJson !== 'string' || !(imageFile instanceof File)) {
    return Response.json({ error: 'Missing config or image' }, { status: 400 });
  }

  const id = nanoid(8);

  const { url: imageUrl } = await put(`shares/${id}/image.jpg`, imageFile, {
    access: 'public',
    addRandomSuffix: false,
  });

  const config = JSON.parse(configJson);
  config.image.src = imageUrl;

  await kv.set(`share:${id}`, config, { ex: 60 * 60 * 24 * 365 });

  const origin = req.nextUrl.origin;
  return Response.json({ id, url: `${origin}/v/${id}` });
}
