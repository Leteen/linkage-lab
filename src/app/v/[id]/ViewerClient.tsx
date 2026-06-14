'use client';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useEditorStore } from '@/store/useEditorStore';
import type { BikeConfig } from '@/lib/kinematics/types';
import { LeverageChart } from '@/components/charts/LeverageChart';
import { AxlePathChart } from '@/components/charts/AxlePathChart';
import { MetricsPanel } from '@/components/charts/MetricsPanel';
import { getPreset } from '@/lib/kinematics/presets';

const ImageCanvas = dynamic(() => import('@/components/editor/ImageCanvas'), { ssr: false });

export function ViewerClient({ config }: { config: BikeConfig }) {
  const loadConfig = useEditorStore((s) => s.loadConfig);
  const setReadOnly = useEditorStore((s) => s.setReadOnly);
  const result = useEditorStore((s) => s.result);

  useEffect(() => {
    setReadOnly(true);
    loadConfig(config);
    return () => setReadOnly(false);
  }, [config, loadConfig, setReadOnly]);

  const preset = getPreset(config.suspensionType);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <a href="/" className="text-xs text-accent hover:text-foreground transition">← Linkage Lab</a>
        <span className="text-border">|</span>
        <span className="text-sm font-medium">{config.name}</span>
        <span className="text-xs text-muted">{preset.name}</span>
        {result && (
          <span className="ml-auto text-xs text-muted mono">
            {result.travelMm.toFixed(0)} mm travel · {result.progressionPct.toFixed(1)}% progression
          </span>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1">
          <ImageCanvas />
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-border bg-panel/80 px-3 py-1.5 text-[11px] text-muted backdrop-blur">
            Read-only view
          </div>
        </div>
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border p-4">
          {result ? (
            <>
              <LeverageChart result={result} />
              <AxlePathChart result={result} />
              <MetricsPanel result={result} />
            </>
          ) : (
            <p className="text-xs text-muted">Computing…</p>
          )}
        </aside>
      </div>
    </div>
  );
}
