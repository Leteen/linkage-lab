import { describe, expect, it } from 'vitest';
import { circleCircle, lineIntersect, rigidMap, rotate } from './geometry';

describe('geometry', () => {
  it('circleCircle finds two symmetric intersections', () => {
    const pts = circleCircle({ x: 0, y: 0 }, 5, { x: 8, y: 0 }, 5);
    expect(pts).toHaveLength(2);
    expect(pts[0].x).toBeCloseTo(4, 6);
    expect(Math.abs(pts[0].y)).toBeCloseTo(3, 6);
  });

  it('circleCircle returns empty when circles are too far apart', () => {
    expect(circleCircle({ x: 0, y: 0 }, 1, { x: 10, y: 0 }, 1)).toHaveLength(0);
  });

  it('lineIntersect returns the crossing point', () => {
    const p = lineIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 });
    expect(p).not.toBeNull();
    expect(p!.x).toBeCloseTo(5, 6);
    expect(p!.y).toBeCloseTo(5, 6);
  });

  it('lineIntersect returns null for parallel lines', () => {
    expect(lineIntersect({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeNull();
  });

  it('rotate spins a point 90 degrees about the origin', () => {
    const p = rotate({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(1, 6);
  });

  it('rigidMap is identity when the member does not move', () => {
    const a0 = { x: 0, y: 0 };
    const b0 = { x: 10, y: 0 };
    const p = rigidMap(a0, b0, a0, b0, { x: 3, y: 4 });
    expect(p.x).toBeCloseTo(3, 6);
    expect(p.y).toBeCloseTo(4, 6);
  });

  it('rigidMap carries an attached point through a rotation', () => {
    // Member rotates 90 deg about a0 = origin: b0 (10,0) -> b1 (0,10).
    const p = rigidMap({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 0 });
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(10, 6);
  });
});
