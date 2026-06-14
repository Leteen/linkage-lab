'use client';
import { useMemo } from 'react';
import type uPlot from 'uplot';
import type { SolveResult } from '@/lib/kinematics/types';
import { mkAxis, UPlotChart } from './UPlotChart';

export function LeverageChart({ result }: { result: SolveResult | null }) {
  const data = useMemo<uPlot.AlignedData>(() => {
    if (!result || result.steps.length === 0) return [[], []];
    return [result.steps.map((s) => s.wheelTravelMm), result.steps.map((s) => s.leverage)];
  }, [result]);

  const options = useMemo<Omit<uPlot.Options, 'width' | 'height'>>(
    () => ({
      scales: { x: { time: false } },
      legend: { show: false },
      cursor: { y: false, points: { size: 6 } },
      series: [
        { label: 'Travel' },
        {
          label: 'Leverage',
          stroke: '#22d3ee',
          width: 2,
          fill: 'rgba(34,211,238,0.10)',
          points: { show: false },
        },
      ],
      axes: [mkAxis('Rear wheel travel (mm)', true), mkAxis('Leverage ratio', false)],
    }),
    [],
  );

  if (!result || result.steps.length === 0) return <ChartEmpty />;
  return <UPlotChart data={data} options={options} height={210} />;
}

function ChartEmpty() {
  return (
    <div className="flex h-[210px] items-center justify-center text-xs text-muted">
      Place the pivots to compute the curve
    </div>
  );
}
