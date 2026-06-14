import Link from 'next/link';

export default async function ViewerPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
      <p className="text-sm text-muted">This share link is no longer supported.</p>
      <Link href="/" className="text-xs text-accent hover:underline">
        ← Linkage Lab
      </Link>
    </div>
  );
}
