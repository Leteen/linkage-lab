// 2D vector + planar-linkage geometry helpers. Pure, dependency-free.
import type { Pt } from './types';

export const vec = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Pt, s: number): Pt => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y;
export const len = (a: Pt): number => Math.hypot(a.x, a.y);
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
export const angleOf = (a: Pt): number => Math.atan2(a.y, a.x);

export function rotate(p: Pt, center: Pt, ang: number): Pt {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return { x: center.x + dx * c - dy * s, y: center.y + dx * s + dy * c };
}

export function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Intersection of two infinite lines (p1->p2) and (p3->p4). Null if parallel. */
export function lineIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

/** Circle-circle intersection. Returns 0, 1, or 2 points. */
export function circleCircle(c1: Pt, r1: number, c2: Pt, r2: number): Pt[] {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-12) return [];
  if (d > r1 + r2 + 1e-9) return [];
  if (d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const xm = c1.x + (a * dx) / d;
  const ym = c1.y + (a * dy) / d;
  if (h < 1e-9) return [{ x: xm, y: ym }];
  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;
  return [
    { x: xm + rx, y: ym + ry },
    { x: xm - rx, y: ym - ry },
  ];
}

/** Pick the candidate nearest to a hint point (for branch continuity). */
export function nearest(cands: Pt[], hint: Pt): Pt | null {
  if (cands.length === 0) return null;
  let best = cands[0];
  let bd = dist(best, hint);
  for (let i = 1; i < cands.length; i++) {
    const dd = dist(cands[i], hint);
    if (dd < bd) {
      bd = dd;
      best = cands[i];
    }
  }
  return best;
}

/**
 * Rigid transform (rotation + translation, no scale) that maps a0->a1 and the
 * direction (a0->b0)->(a1->b1), applied to point p0. Used to place a point that
 * is rigidly attached to a moving member from its reference pose.
 */
export function rigidMap(a0: Pt, b0: Pt, a1: Pt, b1: Pt, p0: Pt): Pt {
  const ang = angleOf(sub(b1, a1)) - angleOf(sub(b0, a0));
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const dx = p0.x - a0.x;
  const dy = p0.y - a0.y;
  return { x: a1.x + dx * c - dy * s, y: a1.y + dx * s + dy * c };
}
