'use client';
import type { SolveResult } from '@/lib/kinematics/types';

function Stat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 px-3 py-2.5">
      <div className="field-label">{label}</div>
      <div className="mono mt-1 text-lg leading-none" style={{ color: accent ?? '#e6edf3' }}>
        {value}
        {unit && <span className="ml-1 text-xs text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export function MetricsPanel({ result }: { result: SolveResult | null }) {
  if (!result || result.steps.length === 0) return null;
  const steps = result.steps;
  const levs = steps.map((s) => s.leverage).filter((v) => Number.isFinite(v));
  const peak = levs.length ? Math.max(...levs) : 0;
  const low = levs.length ? Math.min(...levs) : 0;
  const avg = levs.length ? levs.reduce((a, b) => a + b, 0) / levs.length : 0;
  const last = steps[steps.length - 1];
  const maxRearward = Math.max(...steps.map((s) => s.axleOffset.x));
  const hasKick = steps.some((s) => s.kickbackDeg != null);
  const maxKick = hasKick ? Math.max(...steps.map((s) => s.kickbackDeg ?? 0)) : null;
  const chainGrowth = last.chainGrowthMm ?? null;

  const progLabel = result.progressionPct >= 0 ? 'progressive' : 'regressive';
  const progAccent = result.progressionPct >= 8 ? '#a3e635' : result.progressionPct < 0 ? '#f472b6' : '#e6edf3';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Rear travel" value={result.travelMm.toFixed(0)} unit="mm" accent="#22d3ee" />
        <Stat label="Progression" value={result.progressionPct.toFixed(1)} unit="%" accent={progAccent} />
        <Stat label="Leverage start" value={result.leverageStart.toFixed(2)} accent="#22d3ee" />
        <Stat label="Leverage end" value={result.leverageEnd.toFixed(2)} accent="#22d3ee" />
        <Stat label="Avg / peak LR" value={`${avg.toFixed(2)} / ${peak.toFixed(2)}`} />
        <Stat label="Max rearward axle" value={maxRearward.toFixed(1)} unit="mm" accent="#a3e635" />
        {maxKick != null && <Stat label="Pedal kickback" value={maxKick.toFixed(1)} unit="°" accent="#f59e0b" />}
        {chainGrowth != null && <Stat label="Chain growth" value={chainGrowth.toFixed(1)} unit="mm" accent="#f59e0b" />}
      </div>

      <div className="text-[11px] text-muted">
        LR ranges <span className="mono text-foreground">{low.toFixed(2)}–{peak.toFixed(2)}</span> · curve is{' '}
        <span style={{ color: progAccent }}>{progLabel}</span> · topout shock{' '}
        <span className="mono text-foreground">{result.topoutShockLenMm.toFixed(1)}mm</span> · scale{' '}
        <span className="mono text-foreground">{result.mmPerPixel.toFixed(3)} mm/px</span>
      </div>

      {result.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-300/90">
          {result.warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
