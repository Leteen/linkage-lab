'use client';
import { useState } from 'react';
import { createShare } from '@/lib/storage/share';
import type { BikeConfig } from '@/lib/kinematics/types';

interface Props {
  config: BikeConfig;
  onClose: () => void;
}

type State = 'idle' | 'loading' | 'done' | 'error';

export function ShareDialog({ config, onClose }: Props) {
  const [state, setState] = useState<State>('idle');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setState('loading');
    try {
      const result = await createShare(config);
      setUrl(result.url);
      setState('done');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unknown error');
      setState('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Share bike</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition">✕</button>
        </div>

        <p className="mb-5 text-xs leading-relaxed text-muted">
          Creates a read-only link with the current marker positions and charts. The link is valid for 1 year.
        </p>

        {state === 'idle' && (
          <button
            onClick={handleCreate}
            className="w-full rounded-xl border border-accent bg-accent/10 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20"
          >
            Create share link
          </button>
        )}

        {state === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted">
            <span className="animate-spin">⟳</span> Uploading…
          </div>
        )}

        {state === 'done' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                className="num-input flex-1 !font-sans text-xs"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className="rounded-xl border border-border bg-panel-2 px-3 text-xs text-muted hover:text-foreground transition"
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-muted">
              Anyone with this link can view the kinematics — they cannot edit.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-xs text-red-400">
            <strong>Error:</strong> {err}
            <br />
            {err.includes('not configured') && (
              <span className="mt-2 block text-muted">
                Enable Vercel Blob + Upstash Redis in your Vercel project settings, then redeploy.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
