// Generic four-bar linkage solve for one driver angle.
import type { Pt } from './types';
import { circleCircle, nearest } from './geometry';

/**
 * Given the link-1 angle `theta` about ground pivot g1, locate both moving
 * pivots. `m1` is on link 1 (g1 -> m1, length L1). `m2` is on link 2
 * (g2 -> m2, length L2) and on the coupler (m1 -> m2, length Lc).
 * The branch closest to `hintM2` is chosen for continuity across a sweep.
 */
export function fourBar(
  g1: Pt,
  g2: Pt,
  L1: number,
  L2: number,
  Lc: number,
  theta: number,
  hintM2: Pt,
): { m1: Pt; m2: Pt } | null {
  const m1: Pt = { x: g1.x + L1 * Math.cos(theta), y: g1.y + L1 * Math.sin(theta) };
  const cands = circleCircle(g2, L2, m1, Lc);
  const m2 = nearest(cands, hintM2);
  if (!m2) return null;
  return { m1, m2 };
}
