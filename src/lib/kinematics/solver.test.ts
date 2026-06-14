import { describe, expect, it } from 'vitest';
import { solve } from './solver';
import { defaultPoints, ALL_PRESETS, getPreset } from './presets';
import type { BikeConfig, MemberId, Pt, SuspensionType } from './types';

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

describe('solver — explicit shock drive member', () => {
  const pts = defaultPoints('dwlink', 1200, 800);
  const base = makeConfig('dwlink', pts, 1200, 800, 435, 210, 55);
  const members: MemberId[] = ['link1', 'link2', 'coupler'];
  const results = members.map((m) => ({
    m,
    res: solve({ ...base, shock: { ...base.shock, driveMember: m } }, 80),
  }));

  it('changes the outcome depending on which member the shock drives', () => {
    const travels = results.map((r) => r.res.travelMm);
    const distinct = new Set(travels.map((t) => t.toFixed(2)));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('at least one member yields plausible positive travel', () => {
    expect(results.some((r) => r.res.travelMm > 5)).toBe(true);
  });

  it('flags negative travel with an actionable warning', () => {
    for (const { res } of results) {
      if (res.travelMm < 0) {
        expect(res.warnings.some((w) => w.toLowerCase().includes('negative'))).toBe(true);
      }
    }
  });

  it('does not auto-switch away from an explicit member at a coincident frame eye', () => {
    // shockFrame coincides with the lower-link ground pivot — the old auto-switch
    // would relocate the shock to the coupler; an explicit choice must override it.
    const coincidentPts = { ...pts, shockFrame: { ...pts.lowerFront } };
    const cfg: BikeConfig = {
      ...base,
      points: coincidentPts,
      coincident: [['shockFrame', 'lowerFront']],
      shock: { ...base.shock, driveMember: 'coupler' },
    };
    const res = solve(cfg, 80);
    expect(res.warnings.some((w) => w.includes('auto-switched'))).toBe(false);
  });
});

describe('solver — animation frames', () => {
  for (const type of ['dwlink', 'horst', 'singlepivot'] as SuspensionType[]) {
    const pts = defaultPoints(type, 1200, 800);
    const cfg = makeConfig(type, pts, 1200, 800, 435, 210, 55);
    const res = solve(cfg, 40, { withFrames: true });

    it(`${type}: returns one pixel-space frame per step`, () => {
      expect(res.frames).toBeDefined();
      expect(res.frames!).toHaveLength(res.steps.length);
    });

    it(`${type}: frame 0 matches the marked (topout) points`, () => {
      const f0 = res.frames![0];
      for (const role of getPreset(type).roles) {
        expect(f0[role.key]).toBeDefined();
        expect(Math.abs(f0[role.key].x - pts[role.key].x)).toBeLessThan(0.6);
        expect(Math.abs(f0[role.key].y - pts[role.key].y)).toBeLessThan(0.6);
      }
    });

    it(`${type}: every frame coordinate is finite`, () => {
      for (const frame of res.frames!) {
        for (const role of getPreset(type).roles) {
          expect(Number.isFinite(frame[role.key].x)).toBe(true);
          expect(Number.isFinite(frame[role.key].y)).toBe(true);
        }
      }
    });
  }

  it('omits frames unless requested', () => {
    const pts = defaultPoints('dwlink', 1200, 800);
    const res = solve(makeConfig('dwlink', pts, 1200, 800, 435, 210, 55), 40);
    expect(res.frames).toBeUndefined();
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
