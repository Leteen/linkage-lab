'use client';
import { useState } from 'react';
import { createShare } from '@/lib/storage/share';
import type { BikeConfig } from '@/lib/kinematics/types';

interface Props {
  config: BikeConfig;
  onClose: () => void;
}

export function ShareDialog({ config, onClose }: Props) {
  const { url } = createShare(config);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(config.name || 'bike').replace(/[^a-z0-9_-]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Share / Export</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition">✕</button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Share link</p>
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
              Read-only view with charts. The photo is not included in the link.
            </p>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs font-medium text-foreground">Export as JSON file</p>
            <button
              onClick={handleExport}
              className="w-full rounded-xl border border-border bg-panel-2 py-2.5 text-xs text-muted hover:text-foreground transition"
            >
              Download .json (includes photo)
            </button>
            <p className="text-[11px] text-muted">
              Full config with the photo embedded. Import on any device using the Import button.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
