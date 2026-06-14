import { describe, expect, it } from 'vitest';
import { solve } from './solver';
import { defaultPoints, ALL_PRESETS } from './presets';
import type { BikeConfig, Pt, SuspensionType } from './types';

function makeConfig(
  type: SuspensionType,
  points: Record<string, Pt>,
  width: number,
  height: number,
  chainstayMm: number,
  e2e: number,
  stroke: number,
  drivetrain?: { chainringT: number; cogT: number },
): BikeConfig {
  return {
    id: 't',
    name: 'test',
    suspensionType: type,
    points,
    image: { src: '', width, height },
    calibration: { chainstayMm },
    shock: { eyeToEyeMm: e2e, strokeMm: stroke },
    drivetrain,
  };
}

describe('solver — single pivot (deterministic)', () => {
  const points: Record<string, Pt> = {
    mainPivot: { x: 350, y: 330 },
    axle: { x: 760, y: 360 },
    shockFrame: { x: 380, y: 170 },
    shockMoving: { x: 520, y: 330 },
    bb: { x: 360, y: 360 },
  };
  const config = makeConfig('singlepivot', points, 1000, 700, 430, 229, 55, { chainringT: 32, cogT: 50 });
  const res = solve(config, 120);

  it('produces a full sweep', () => {
    expect(res.steps).toHaveLength(121);
  });

  it('reaches a physically plausible rear-wheel travel', () => {
    expect(res.travelMm).toBeGreaterThan(80);
    expect(res.travelMm).toBeLessThan(260);
  });

  it('wheel travel increases monotonically with shock compression', () => {
    for (let i = 1; i < res.steps.length; i++) {
      expect(res.steps[i].shockTravelMm).toBeGreaterThanOrEqual(res.steps[i - 1].shockTravelMm);
      expect(res.steps[i].wheelTravelMm).toBeGreaterThanOrEqual(res.steps[i - 1].wheelTravelMm - 1e-6);
    }
  });

  it('leverage ratios are in a sane band and finite', () => {
    for (const s of res.steps) {
      expect(Number.isFinite(s.leverage)).toBe(true);
      expect(s.leverage).toBeGreaterThan(1.5);
      expect(s.leverage).toBeLessThan(5);
    }
  });

  it('reports finite progression and pedal kickback', () => {
    expect(Number.isFinite(res.progressionPct)).toBe(true);
    const last = res.steps[res.steps.length - 1];
    expect(Number.isFinite(last.kickbackDeg!)).toBe(true);
    expect(last.kickbackDeg!).not.toBe(0);
  });
});

describe('solver — every preset solves without throwing', () => {
  for (const preset of ALL_PRESETS) {
    it(`${preset.type} returns finite results`, () => {
      const pts = defaultPoints(preset.type, 1200, 800);
      const res = solve(makeConfig(preset.type, pts, 1200, 800, 435, 210, 55), 80);
      expect(res.steps.length).toBeGreaterThan(0);
      expect(Number.isFinite(res.travelMm)).toBe(true);
      expect(res.travelMm).toBeGreaterThanOrEqual(0);
      for (const s of res.steps) {
        expect(Number.isFinite(s.leverage)).toBe(true);
        expect(Number.isFinite(s.wheelTravelMm)).toBe(true);
      }
    });
  }
});
