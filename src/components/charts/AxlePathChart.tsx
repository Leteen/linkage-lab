'use client';
import { useMemo } from 'react';
import type uPlot from 'uplot';
import type { SolveResult } from '@/lib/kinematics/types';
import { mkAxis, UPlotChart } from './UPlotChart';

/** Rearward axle offset (mm) vs rear-wheel travel (mm). */
export function AxlePathChart({ result }: { result: SolveResult | null }) {
  const data = useMemo<uPlot.AlignedData>(() => {
    if (!result || result.steps.length === 0) return [[], []];
    return [result.steps.map((s) => s.wheelTravelMm), result.steps.map((s) => s.axleOffset.x)];
  }, [result]);

  const options = useMemo<Omit<uPlot.Options, 'width' | 'height'>>(
    () => ({
      scales: { x: { time: false } },
      legend: { show: false },
      cursor: { y: false },
      series: [
        { label: 'Travel' },
        { label: 'Rearward', stroke: '#a3e635', width: 2, points: { show: false } },
      ],
      axes: [mkAxis('Rear wheel travel (mm)', true), mkAxis('Rearward axle (mm)', false)],
    }),
    [],
  );

  if (!result || result.steps.length === 0)
    return <div className="flex h-[190px] items-center justify-center text-xs text-muted">—</div>;
  return <UPlotChart data={data} options={options} height={190} />;
}
