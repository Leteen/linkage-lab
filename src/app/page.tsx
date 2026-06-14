'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useEditorStore } from '@/store/useEditorStore';
import { Uploader } from '@/components/editor/Uploader';
import { Toolbar } from '@/components/editor/Toolbar';
import { LeverageChart } from '@/components/charts/LeverageChart';
import { AxlePathChart } from '@/components/charts/AxlePathChart';
import { MetricsPanel } from '@/components/charts/MetricsPanel';
import { LibraryPanel } from '@/components/library/LibraryPanel';
import { ShareDialog } from '@/components/library/ShareDialog';
import { saveBike } from '@/lib/storage/bikes';

const ImageCanvas = dynamic(() => import('@/components/editor/ImageCanvas'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted">Loading editor…</div>,
});

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <h3 className="field-label mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function Home() {
  const config = useEditorStore((s) => s.config);
  const result = useEditorStore((s) => s.result);
  const clearImage = useEditorStore((s) => s.clearImage);

  const [showLibrary, setShowLibrary] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = async () => {
    if (!config || saveState !== 'idle') return;
    setSaveState('saving');
    try {
      await saveBike(config);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('idle');
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-panel/60 px-4 py-2.5 backdrop-blur">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-foreground">Linkage Lab</span>
          <span className="hidden text-xs text-muted sm:inline">MTB suspension analyzer</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLibrary(true)}
            className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
          >
            Library
          </button>
          {config && (
            <>
              <button
                onClick={handleSave}
                disabled={saveState !== 'idle'}
                className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs transition disabled:opacity-60
                  data-[state=saved]:border-green-700 data-[state=saved]:text-green-400
                  enabled:text-muted enabled:hover:border-accent enabled:hover:text-accent"
                data-state={saveState === 'saved' ? 'saved' : undefined}
              >
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Save'}
              </button>
              {result && (
                <button
                  onClick={() => setShowShare(true)}
                  className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
                >
                  Share
                </button>
              )}
              <button
                onClick={clearImage}
                className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition hover:border-red-700 hover:text-red-400"
              >
                New photo
              </button>
            </>
          )}
        </div>
      </header>

      {!config ? (
        <Uploader />
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[58vh_1fr] overflow-hidden lg:grid-cols-[1fr_400px] lg:grid-rows-1">
          <section className="relative min-h-0 border-b border-border bg-panel lg:border-b-0 lg:border-r">
            <ImageCanvas />
          </section>
          <aside className="min-h-0 space-y-4 overflow-y-auto p-4">
            <ChartCard title="Leverage ratio / progression">
              <LeverageChart result={result} />
            </ChartCard>
            <MetricsPanel result={result} />
            <ChartCard title="Axle path (rearward vs travel)">
              <AxlePathChart result={result} />
            </ChartCard>
            <Toolbar />
          </aside>
        </div>
      )}

      {showLibrary && <LibraryPanel onClose={() => setShowLibrary(false)} />}
      {showShare && config && <ShareDialog config={config} onClose={() => setShowShare(false)} />}
    </div>
  );
}
