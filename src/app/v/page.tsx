import Link from 'next/link';
import { ViewerClient } from './[id]/ViewerClient';
import type { BikeConfig } from '@/lib/kinematics/types';

export default async function ViewerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const c = typeof sp.c === 'string' ? sp.c : null;

  let config: BikeConfig | null = null;
  if (c) {
    try {
      config = JSON.parse(decodeURIComponent(escape(atob(c))));
    } catch {
      // invalid base64 or JSON — fall through to not-found
    }
  }

  if (!config) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <p className="text-sm text-muted">Invalid or missing share link.</p>
        <Link href="/" className="text-xs text-accent hover:underline">
          ← Linkage Lab
        </Link>
      </div>
    );
  }

  return <ViewerClient config={config} />;
}
