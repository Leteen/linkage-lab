import { db, type SavedBike } from './db';
import type { BikeConfig } from '../kinematics/types';

export async function saveBike(config: BikeConfig): Promise<void> {
  const [imageBlob, thumb] = await Promise.all([
    srcToBlob(config.image.src),
    makeThumbnail(config.image.src),
  ]);
  const record: SavedBike = {
    id: config.id,
    name: config.name,
    suspensionType: config.suspensionType,
    config: { ...config, image: { ...config.image, src: '' } },
    imageBlob,
    thumb,
    savedAt: Date.now(),
  };
  await db.bikes.put(record);
}

export async function loadBike(id: string): Promise<BikeConfig | null> {
  const record = await db.bikes.get(id);
  if (!record) return null;
  const src = URL.createObjectURL(record.imageBlob);
  return { ...record.config, image: { ...record.config.image, src } };
}

export async function listBikes(): Promise<SavedBike[]> {
  return db.bikes.orderBy('savedAt').reverse().toArray();
}

export async function deleteBike(id: string): Promise<void> {
  await db.bikes.delete(id);
}

async function srcToBlob(src: string): Promise<Blob> {
  const res = await fetch(src);
  return res.blob();
}

async function makeThumbnail(src: string, maxW = 300): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = src;
  });
}
