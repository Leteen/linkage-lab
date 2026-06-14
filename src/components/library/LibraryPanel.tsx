'use client';
import { useEffect, useState } from 'react';
import { listBikes, loadBike, deleteBike } from '@/lib/storage/bikes';
import type { SavedBike } from '@/lib/storage/db';
import { useEditorStore } from '@/store/useEditorStore';
import { getPreset } from '@/lib/kinematics/presets';

interface Props {
  onClose: () => void;
}

export function LibraryPanel({ onClose }: Props) {
  const [bikes, setBikes] = useState<SavedBike[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const loadConfig = useEditorStore((s) => s.loadConfig);

  useEffect(() => {
    listBikes().then(setBikes);
  }, []);

  const handleLoad = async (id: string) => {
    const config = await loadBike(id);
    if (config) {
      loadConfig(config);
      onClose();
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteBike(id);
    setBikes((prev) => prev.filter((b) => b.id !== id));
    setDeleting(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Saved bikes</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {bikes.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted">No saved bikes yet. Hit Save in the editor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {bikes.map((b) => {
                const preset = getPreset(b.suspensionType as never);
                return (
                  <div
                    key={b.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-panel-2 transition hover:border-accent/50"
                  >
                    <div
                      className="relative h-32 cursor-pointer bg-black/30"
                      onClick={() => handleLoad(b.id)}
                    >
                      {b.thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.thumb}
                          alt={b.name}
                          className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition"
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                      <span className="truncate text-sm font-medium text-foreground">{b.name}</span>
                      <span className="text-[11px] text-muted">{preset?.name ?? b.suspensionType}</span>
                      <span className="text-[10px] text-muted/60">
                        {new Date(b.savedAt).toLocaleDateString()}
                      </span>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleLoad(b.id)}
                          className="flex-1 rounded-lg border border-border py-1 text-[11px] text-muted hover:border-accent hover:text-accent transition"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          disabled={deleting === b.id}
                          className="rounded-lg border border-border px-2 py-1 text-[11px] text-muted hover:border-red-500 hover:text-red-400 transition disabled:opacity-40"
                        >
                          {deleting === b.id ? '…' : '✕'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
