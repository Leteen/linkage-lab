// The kinematics solver: sweep the shock through its stroke and produce a
// per-step record of axle position, leverage, instant centre and (optionally)
// chain growth + pedal kickback.
import type { BikeConfig, Pt, SolveResult, SolveStep } from './types';
import { angleOf, dist, lineIntersect, rigidMap, rotate, sub } from './geometry';
import { fourBar } from './fourbar';
import { getPreset, type MemberId } from './presets';
import { chainGrowthSeries, computeLeverage, kickbackSeries, progression } from './metrics';

interface Pose {
  axle: Pt;
  shockEye: Pt;
  ic: Pt | null;
  m1: Pt;
  m2: Pt;
}

export function mmPerPixel(config: BikeConfig): number {
  const px = dist(config.points.bb, config.points.axle);
  if (px < 1e-6) return 0;
  return config.calibration.chainstayMm / px;
}

/** Convert all marker points to world mm with y pointing up. */
function worldPoints(config: BikeConfig, mmpp: number): Record<string, Pt> {
  const h = config.image.height;
  const out: Record<string, Pt> = {};
  for (const key of Object.keys(config.points)) {
    const p = config.points[key];
    out[key] = { x: p.x * mmpp, y: (h - p.y) * mmpp };
  }
  return out;
}

export function solve(config: BikeConfig, N = 120, opts: { withFrames?: boolean } = {}): SolveResult {
  const warnings: string[] = [];
  const mmpp = mmPerPixel(config);
  const W = worldPoints(config, mmpp);
  const preset = getPreset(config.suspensionType);
  const mech = preset.mech;
  const stroke = config.shock.strokeMm;
  const imgH = config.image.height;

  const shockFrame = W.shockFrame;
  const axleRef = W.axle;
  const shockMovingRef = W.shockMoving;
  const bbWorld = W.bb;

  let poseAt: (param: number, hint: Pose | null) => Pose | null;
  let paramRef: number;

  if (mech.kind === 'singlepivot') {
    const pivot = W[mech.g1];
    paramRef = 0;
    poseAt = (delta) => {
      const axle = rotate(axleRef, pivot, delta);
      const shockEye = rotate(shockMovingRef, pivot, delta);
      return { axle, shockEye, ic: pivot, m1: axle, m2: axle };
    };
  } else {
    const g1 = W[mech.g1];
    const g2 = W[mech.g2!];
    const m1ref = W[mech.m1];
    const m2ref = W[mech.m2!];
    const L1 = dist(g1, m1ref);
    const L2 = dist(g2, m2ref);
    const Lc = dist(m1ref, m2ref);
    paramRef = angleOf(sub(m1ref, g1));

    // The member the moving shock eye rides on. An explicit user choice always
    // wins; otherwise fall back to the preset default plus a degeneracy guard.
    const explicitMember = config.shock.driveMember;
    let effectiveShockMember: MemberId = explicitMember ?? mech.shockMember;
    if (!explicitMember) {
      // When shockFrame coincides with a ground pivot the shock-eye distance is
      // invariant (it just rotates about that pivot) → 0mm travel.  Detect and
      // switch to a member whose motion is actually coupled to the frame.
      const atG1 = dist(shockFrame, g1) < 0.5;
      const atG2 = dist(shockFrame, g2) < 0.5;
      const degenerate =
        (atG1 && effectiveShockMember === 'link1') ||
        (atG2 && effectiveShockMember === 'link2');
      if (degenerate) {
        const chosen = (['coupler', 'link2', 'link1'] as MemberId[]).find((m) => {
          if (m === 'link1') return !atG1;
          if (m === 'link2') return !atG2;
          return true; // coupler is never degenerate
        }) ?? 'coupler';
        effectiveShockMember = chosen;
        warnings.push(
          `shockFrame coincides with a ground pivot — shock member auto-switched to '${chosen}'. Set 'Shock drives' explicitly if this is wrong.`,
        );
      }
    }

    const placeOnMember = (member: MemberId, refP: Pt, m1: Pt, m2: Pt): Pt => {
      if (member === 'link1') return rigidMap(g1, m1ref, g1, m1, refP);
      if (member === 'link2') return rigidMap(g2, m2ref, g2, m2, refP);
      return rigidMap(m1ref, m2ref, m1, m2, refP); // coupler
    };

    poseAt = (theta, hint) => {
      const hintM2 = hint ? hint.m2 : m2ref;
      const r = fourBar(g1, g2, L1, L2, Lc, theta, hintM2);
      if (!r) return null;
      const { m1, m2 } = r;
      return {
        axle: placeOnMember(mech.axleMember, axleRef, m1, m2),
        shockEye: placeOnMember(effectiveShockMember, shockMovingRef, m1, m2),
        ic: lineIntersect(g1, m1, g2, m2),
        m1,
        m2,
      };
    };
  }

  const refPose = poseAt(paramRef, null);
  if (!refPose) {
    return emptyResult(mmpp, 0, ['Could not solve the mechanism at the marked pose. Check pivot placement.']);
  }
  const shockLenAt = (pose: Pose) => dist(shockFrame, pose.shockEye);
  const topoutShockLen = shockLenAt(refPose);

  if (
    config.shock.lockLength === false &&
    config.shock.eyeToEyeMm > 0 &&
    Math.abs(topoutShockLen - config.shock.eyeToEyeMm) > 3
  ) {
    warnings.push(
      `Marked shock length ${topoutShockLen.toFixed(1)}mm differs from eye-to-eye ${config.shock.eyeToEyeMm}mm — check chainstay calibration or shock-eye markers.`,
    );
  }

  // Determine the parameter direction that compresses the shock.
  const h = 0.002;
  const pPlus = poseAt(paramRef + h, refPose);
  const pMinus = poseAt(paramRef - h, refPose);
  const lPlus = pPlus ? shockLenAt(pPlus) : Infinity;
  const lMinus = pMinus ? shockLenAt(pMinus) : Infinity;
  let dir: number;
  if (lPlus < topoutShockLen && lPlus <= lMinus) dir = 1;
  else if (lMinus < topoutShockLen) dir = -1;
  else dir = lPlus <= lMinus ? 1 : -1;

  const dLdp = Math.abs(((dir === 1 ? lPlus : lMinus) - topoutShockLen) / h) || 1;
  let step = stroke / (N * 3) / dLdp;
  step = Math.min(Math.max(step, 1e-5), 0.02) * dir;

  // March from topout into compression, collecting samples.
  const samples: { param: number; shockLen: number; pose: Pose }[] = [
    { param: paramRef, shockLen: topoutShockLen, pose: refPose },
  ];
  let prev = refPose;
  let param = paramRef;
  const target = topoutShockLen - stroke;
  for (let i = 0; i < 80000; i++) {
    param += step;
    const pose = poseAt(param, prev);
    if (!pose) {
      warnings.push('Linkage reached a bind before full stroke.');
      break;
    }
    const sl = shockLenAt(pose);
    if (sl >= samples[samples.length - 1].shockLen) {
      warnings.push('Shock motion reversed (toggle/binding) before full stroke.');
      break;
    }
    samples.push({ param, shockLen: sl, pose });
    prev = pose;
    if (sl <= target) break;
  }

  const reached = topoutShockLen - samples[samples.length - 1].shockLen;
  const usableStroke = Math.min(stroke, reached);
  if (usableStroke < stroke - 0.5) {
    warnings.push(`Only ${usableStroke.toFixed(1)}mm of ${stroke}mm stroke is reachable from the marked geometry.`);
  }

  const poseAtShockLen = (sl: number): Pose => {
    if (sl >= samples[0].shockLen) return samples[0].pose;
    const last = samples[samples.length - 1];
    if (sl <= last.shockLen) return last.pose;
    let i = 1;
    while (i < samples.length && samples[i].shockLen > sl) i++;
    const a = samples[i - 1];
    const b = samples[i];
    const t = (a.shockLen - sl) / (a.shockLen - b.shockLen);
    const interpParam = a.param + (b.param - a.param) * t;
    return poseAt(interpParam, a.pose) ?? a.pose;
  };

  const axle0 = refPose.axle;
  const rearSign = Math.sign(axle0.x - bbWorld.x) || 1;

  // Optional per-step pixel-space marker maps for animation. Every moving marker
  // in every preset is exactly one of {m1, m2, axle, shockMoving}; the rest are
  // frame-fixed and keep their marked pixel position.
  const wantFrames = !!opts.withFrames && mmpp > 0;
  const frames: Record<string, Pt>[] | undefined = wantFrames ? [] : undefined;
  const toPx = (w: Pt): Pt => ({ x: w.x / mmpp, y: imgH - w.y / mmpp });
  const frameFor = (pose: Pose): Record<string, Pt> => {
    const out: Record<string, Pt> = {};
    for (const key of Object.keys(config.points)) {
      if (key === mech.m1) out[key] = toPx(pose.m1);
      else if (mech.m2 && key === mech.m2) out[key] = toPx(pose.m2);
      else if (key === 'axle') out[key] = toPx(pose.axle);
      else if (key === 'shockMoving') out[key] = toPx(pose.shockEye);
      else out[key] = { ...config.points[key] }; // frame-fixed
    }
    return out;
  };

  const steps: SolveStep[] = [];
  for (let i = 0; i <= N; i++) {
    const shockTravel = (i / N) * usableStroke;
    const sl = topoutShockLen - shockTravel;
    const pose = poseAtShockLen(sl);
    steps.push({
      shockLenMm: sl,
      shockTravelMm: shockTravel,
      wheelTravelMm: pose.axle.y - axle0.y,
      leverage: 0,
      axle: pose.axle,
      axleOffset: { x: (pose.axle.x - axle0.x) * rearSign, y: pose.axle.y - axle0.y },
      instantCenter: pose.ic,
    });
    if (frames) frames.push(frameFor(pose));
  }

  const travels = steps.map((s) => s.wheelTravelMm);
  const shockTravels = steps.map((s) => s.shockTravelMm);
  const lev = computeLeverage(travels, shockTravels);
  for (let i = 0; i < steps.length; i++) steps[i].leverage = lev[i];

  if (config.drivetrain) {
    const cg = chainGrowthSeries(bbWorld, steps.map((s) => s.axle));
    const kb = kickbackSeries(cg, config.drivetrain.chainringT);
    for (let i = 0; i < steps.length; i++) {
      steps[i].chainGrowthMm = cg[i];
      steps[i].kickbackDeg = kb[i];
    }
  }

  const prog = progression(lev);
  const travelMm = steps[steps.length - 1].wheelTravelMm;
  if (travelMm < 0) {
    warnings.push(
      "Rear travel is negative — the shock's moving eye is on the wrong link. Use 'Shock drives' to pick the correct member.",
    );
  }
  return {
    steps,
    travelMm,
    progressionPct: prog.pct,
    leverageStart: prog.start,
    leverageEnd: prog.end,
    mmPerPixel: mmpp,
    topoutShockLenMm: topoutShockLen,
    warnings,
    frames,
  };
}

function emptyResult(mmpp: number, topout: number, warnings: string[]): SolveResult {
  return {
    steps: [],
    travelMm: 0,
    progressionPct: 0,
    leverageStart: 0,
    leverageEnd: 0,
    mmPerPixel: mmpp,
    topoutShockLenMm: topout,
    warnings,
  };
}
