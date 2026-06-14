'use client';
import dynamic from 'next/dynamic';
import { useEditorStore } from '@/store/useEditorStore';
import { Uploader } from '@/components/editor/Uploader';
import { Toolbar } from '@/components/editor/Toolbar';
import { LeverageChart } from '@/components/charts/LeverageChart';
import { AxlePathChart } from '@/components/charts/AxlePathChart';
import { MetricsPanel } from '@/components/charts/MetricsPanel';

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

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-panel/60 px-4 py-2.5 backdrop-blur">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-foreground">Linkage Lab</span>
          <span className="hidden text-xs text-muted sm:inline">MTB suspension analyzer</span>
        </div>
        {config && (
          <button
            onClick={clearImage}
            className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
          >
            New photo
          </button>
        )}
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
    </div>
  );
}
