import Link from 'next/link';
import { kv } from '@vercel/kv';
import { ViewerClient } from './ViewerClient';
import type { BikeConfig } from '@/lib/kinematics/types';

export default async function ViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let config: BikeConfig | null = null;
  try {
    config = await kv.get<BikeConfig>(`share:${id}`);
  } catch {
    // KV not configured or unreachable
  }

  if (!config) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <p className="text-sm text-muted">Bike not found or share link expired.</p>
        <Link href="/" className="text-xs text-accent hover:underline">
          ← Back to Linkage Lab
        </Link>
      </div>
    );
  }

  return <ViewerClient config={config} />;
}
