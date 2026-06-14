// Core domain types for the suspension kinematics engine.
// All marker points are stored in IMAGE PIXEL coordinates (origin top-left, y down).
// The solver converts to a world frame in millimetres with y pointing UP.

export type SuspensionType =
  | 'horst'
  | 'fauxbar'
  | 'vpp'
  | 'dwlink'
  | 'singlepivot';

export interface Pt {
  x: number;
  y: number;
}

export interface SpringConfig {
  type: 'coil' | 'air';
  coilRateNmm?: number;
  preloadN?: number;
  airPressurePsi?: number;
  canVolumeCc?: number;
  progression?: number;
}

export interface RiderConfig {
  weightKg: number;
  bikeWeightKg?: number;
  cogHeightMm?: number;
  cogRearFracPct?: number;
}

export interface BikeConfig {
  id: string;
  name: string;
  suspensionType: SuspensionType;
  /** Role keyed marker positions, in image pixels. */
  points: Record<string, Pt>;
  /** Groups of roles that share one physical point (e.g. shock eye on a link pivot). */
  coincident?: string[][];
  image: { src: string; width: number; height: number };
  /** Real-world calibration: chainstay = BB centre to rear axle centre. */
  calibration: { chainstayMm: number };
  shock: { eyeToEyeMm: number; strokeMm: number };
  drivetrain?: { chainringT: number; cogT: number };
  wheel?: { rearRadiusMm: number; frontRadiusMm?: number };
  spring?: SpringConfig;
  rider?: RiderConfig;
}

export interface SolveStep {
  /** Shock eye-to-eye length at this step (mm). */
  shockLenMm: number;
  /** Shock compression from topout (mm), 0..stroke. */
  shockTravelMm: number;
  /** Rear-wheel vertical travel from topout (mm). */
  wheelTravelMm: number;
  /** Leverage ratio = d(wheelTravel)/d(shockTravel). */
  leverage: number;
  /** Rear axle position, world mm (y up). */
  axle: Pt;
  /** Axle displacement from topout: x = rearward+, y = up+. */
  axleOffset: Pt;
  /** Instant centre of the rear triangle vs frame, world mm. */
  instantCenter: Pt | null;
  chainGrowthMm?: number;
  kickbackDeg?: number;
}

export interface SolveResult {
  steps: SolveStep[];
  travelMm: number;
  progressionPct: number;
  leverageStart: number;
  leverageEnd: number;
  mmPerPixel: number;
  topoutShockLenMm: number;
  warnings: string[];
}
