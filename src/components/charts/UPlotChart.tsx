'use client';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useEffect, useRef } from 'react';

export interface UPlotChartProps {
  data: uPlot.AlignedData;
  options: Omit<uPlot.Options, 'width' | 'height'>;
  height?: number;
}

export const GRID = 'rgba(255,255,255,0.06)';
export const TICK = 'rgba(255,255,255,0.12)';
export const AXIS_STROKE = '#8b97a7';
const FONT = '11px ui-monospace, monospace';

export function mkAxis(label: string, isX: boolean): uPlot.Axis {
  return {
    label,
    labelSize: 22,
    labelFont: '11px ui-monospace, monospace',
    stroke: AXIS_STROKE,
    font: FONT,
    grid: { stroke: GRID, width: 1 },
    ticks: { stroke: TICK, width: 1, size: isX ? 4 : 4 },
    size: isX ? 34 : 44,
  };
}

/** Thin React wrapper around uPlot with live setData + resize handling. */
export function UPlotChart({ data, options, height = 200 }: UPlotChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  const dataRef = useRef(data);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const opts = { ...options, width: el.clientWidth || 320, height } as uPlot.Options;
    const u = new uPlot(opts, dataRef.current, el);
    plot.current = u;
    const ro = new ResizeObserver(() => {
      u.setSize({ width: el.clientWidth || 320, height });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      u.destroy();
      plot.current = null;
    };
  }, [options, height]);

  useEffect(() => {
    dataRef.current = data;
    plot.current?.setData(data);
  }, [data]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
