// Derived kinematic metrics computed from a solved sweep.
import type { Pt } from './types';
import { dist } from './geometry';

const CHAIN_PITCH_MM = 12.7; // 1/2" chain

/** Leverage ratio = d(wheelTravel)/d(shockTravel), central differences. */
export function computeLeverage(travels: number[], shockTravels: number[]): number[] {
  const n = travels.length;
  const lev = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const dW = travels[b] - travels[a];
    const dS = shockTravels[b] - shockTravels[a];
    lev[i] = dS !== 0 ? dW / dS : 0;
  }
  return lev;
}

/** Progression: positive % = falling-rate (progressive) suspension. */
export function progression(lev: number[]): { start: number; end: number; pct: number } {
  const n = lev.length;
  const start = n > 2 ? lev[1] : lev[0];
  const end = n > 2 ? lev[n - 2] : lev[n - 1];
  const pct = start !== 0 ? ((start - end) / start) * 100 : 0;
  return { start, end, pct };
}

/** Chain growth: change in BB-centre-to-axle distance vs topout (mm). */
export function chainGrowthSeries(bb: Pt, axles: Pt[]): number[] {
  if (axles.length === 0) return [];
  const d0 = dist(bb, axles[0]);
  return axles.map((a) => dist(bb, a) - d0);
}

/** Pedal kickback (deg) felt at the cranks for a given chainring tooth count. */
export function kickbackSeries(chainGrowthMm: number[], chainringT: number): number[] {
  const r = (chainringT * CHAIN_PITCH_MM) / (2 * Math.PI); // chainring pitch radius, mm
  if (r <= 0) return chainGrowthMm.map(() => 0);
  return chainGrowthMm.map((g) => (g / r) * (180 / Math.PI));
}
