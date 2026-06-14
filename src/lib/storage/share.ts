import type { BikeConfig } from '../kinematics/types';

export interface ShareResult {
  id: string;
  url: string;
}

export async function createShare(config: BikeConfig): Promise<ShareResult> {
  const imageBlob = await resizeImage(config.image.src, 1920);
  const form = new FormData();
  form.append('config', JSON.stringify({ ...config, image: { ...config.image, src: '' } }));
  form.append('image', imageBlob, 'image.jpg');
  const res = await fetch('/api/share', { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<ShareResult>;
}

async function resizeImage(src: string, maxDim: number): Promise<Blob> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.88),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
