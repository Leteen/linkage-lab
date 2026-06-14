import { create } from 'zustand';
import { solve } from '@/lib/kinematics/solver';
import { defaultPoints } from '@/lib/kinematics/presets';
import type { BikeConfig, Pt, SolveResult, SuspensionType } from '@/lib/kinematics/types';

let counter = 0;
const uid = () => `bike_${Date.now().toString(36)}_${counter++}`;

function recompute(config: BikeConfig | null): SolveResult | null {
  if (!config) return null;
  try {
    return solve(config, 120);
  } catch {
    return null;
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Spread into any config-mutating set() so a stale animation stops. */
const stopAnim = { animating: false, animFrames: null, animIndex: 0 } as const;

export interface EditorState {
  config: BikeConfig | null;
  result: SolveResult | null;
  selectedRole: string | null;

  precision: boolean;
  ctrlHeld: boolean;
  readOnly: boolean;

  // animation
  animating: boolean;
  animFrames: Record<string, Pt>[] | null;
  animIndex: number;
  dimImage: boolean;

  // actions
  initImage: (src: string, width: number, height: number, type?: SuspensionType) => void;
  clearImage: () => void;
  setSuspensionType: (type: SuspensionType) => void;
  movePoint: (role: string, x: number, y: number) => void;
  moveShock: (role: string, x: number, y: number) => void;
  nudge: (role: string, dx: number, dy: number) => void;
  toggleCoincident: (a: string, b: string) => void;
  select: (role: string | null) => void;
  setName: (name: string) => void;
  setChainstay: (mm: number) => void;
  setShock: (patch: Partial<BikeConfig['shock']>) => void;
  setDrivetrain: (patch: Partial<NonNullable<BikeConfig['drivetrain']>>) => void;
  setPrecision: (on: boolean) => void;
  setCtrl: (on: boolean) => void;
  setReadOnly: (on: boolean) => void;
  loadConfig: (config: BikeConfig) => void;

  playAnimation: () => void;
  stopAnimation: () => void;
  setAnimIndex: (i: number) => void;
  setDimImage: (on: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  config: null,
  result: null,
  selectedRole: null,
  precision: false,
  ctrlHeld: false,
  readOnly: false,
  animating: false,
  animFrames: null,
  animIndex: 0,
  dimImage: false,

  initImage: (src, width, height, type = 'horst') => {
    const config: BikeConfig = {
      id: uid(),
      name: 'My bike',
      suspensionType: type,
      points: defaultPoints(type, width, height),
      coincident: [],
      image: { src, width, height },
      calibration: { chainstayMm: 435 },
      shock: { eyeToEyeMm: 210, strokeMm: 55 },
      drivetrain: { chainringT: 32, cogT: 52 },
    };
    set({ config, result: recompute(config), selectedRole: null, ...stopAnim });
  },

  clearImage: () => set({ config: null, result: null, selectedRole: null, ...stopAnim }),

  setSuspensionType: (type) => {
    const { config } = get();
    if (!config) return;
    // Keep shared markers (bb, axle, shock eyes) where the user already placed them.
    const fresh = defaultPoints(type, config.image.width, config.image.height);
    const points: Record<string, Pt> = { ...fresh };
    for (const key of Object.keys(points)) {
      if (config.points[key]) points[key] = config.points[key];
    }
    const coincident = (config.coincident ?? [])
      .map((g) => g.filter((r) => points[r]))
      .filter((g) => g.length >= 2);
    const next = { ...config, suspensionType: type, points, coincident };
    set({ config: next, result: recompute(next), selectedRole: null, ...stopAnim });
  },

  movePoint: (role, x, y) => {
    const { config, readOnly } = get();
    if (!config || readOnly) return;
    const px = clamp(x, 0, config.image.width);
    const py = clamp(y, 0, config.image.height);
    const group = (config.coincident ?? []).find((g) => g.includes(role));
    const points = { ...config.points };
    if (group) for (const k of group) points[k] = { x: px, y: py };
    else points[role] = { x: px, y: py };
    const next = { ...config, points };
    set({ config: next, result: recompute(next), ...stopAnim });
  },

  moveShock: (role, x, y) => {
    const { config, readOnly, result } = get();
    if (!config || readOnly) return;
    const w = config.image.width;
    const h = config.image.height;
    const cx = (v: number) => clamp(v, 0, w);
    const cy = (v: number) => clamp(v, 0, h);
    const frame = config.points.shockFrame;
    const moving = config.points.shockMoving;
    const mmpp = result && result.mmPerPixel > 0 ? result.mmPerPixel : null;
    const e2e = config.shock.eyeToEyeMm;
    const locked = config.shock.lockLength !== false && mmpp != null && e2e > 0;

    // No shock pair, or unlocked → behave like an ordinary marker.
    if (!frame || !moving || !locked || (role !== 'shockFrame' && role !== 'shockMoving')) {
      get().movePoint(role, x, y);
      return;
    }

    const points = { ...config.points };
    const setRole = (key: string, p: Pt) => {
      const group = (config.coincident ?? []).find((g) => g.includes(key));
      if (group) for (const k of group) points[k] = { ...p };
      else points[key] = { ...p };
    };

    const R = e2e / mmpp!; // locked eye-to-eye length, in pixels
    if (role === 'shockMoving') {
      // Pin the length: project the requested point onto the circle of radius R.
      const dx = x - frame.x;
      const dy = y - frame.y;
      const d = Math.hypot(dx, dy) || 1;
      setRole('shockMoving', { x: cx(frame.x + (dx / d) * R), y: cy(frame.y + (dy / d) * R) });
    } else {
      // Move the whole shock rigidly: translate both eyes by the same delta.
      const nfx = cx(x);
      const nfy = cy(y);
      const tdx = nfx - frame.x;
      const tdy = nfy - frame.y;
      setRole('shockFrame', { x: nfx, y: nfy });
      setRole('shockMoving', { x: cx(moving.x + tdx), y: cy(moving.y + tdy) });
    }
    const next = { ...config, points };
    set({ config: next, result: recompute(next), ...stopAnim });
  },

  toggleCoincident: (a, b) => {
    const { config, readOnly } = get();
    if (!config || readOnly || a === b || !config.points[a] || !config.points[b]) return;
    const w = config.image.width;
    const h = config.image.height;
    let groups = (config.coincident ?? []).map((g) => [...g]);
    const ga = groups.find((g) => g.includes(a));
    const gb = groups.find((g) => g.includes(b));
    const points = { ...config.points };
    if (ga && ga === gb) {
      // Already linked: detach b and nudge it so it is grabbable again.
      const idx = groups.indexOf(ga);
      groups[idx] = ga.filter((r) => r !== b);
      if (groups[idx].length < 2) groups.splice(idx, 1);
      points[b] = { x: clamp(points[b].x + 18, 0, w), y: clamp(points[b].y + 18, 0, h) };
    } else {
      // Merge the groups of a and b, snap everyone onto a's position.
      const union = new Set<string>([a, b]);
      if (ga) ga.forEach((r) => union.add(r));
      if (gb) gb.forEach((r) => union.add(r));
      groups = groups.filter((g) => g !== ga && g !== gb);
      const merged = Array.from(union);
      groups.push(merged);
      const anchor = points[a];
      for (const r of merged) points[r] = { x: anchor.x, y: anchor.y };
    }
    const next = { ...config, coincident: groups, points };
    set({ config: next, result: recompute(next), selectedRole: a, ...stopAnim });
  },

  nudge: (role, dx, dy) => {
    const { config } = get();
    if (!config || !config.points[role]) return;
    const p = config.points[role];
    get().movePoint(role, p.x + dx, p.y + dy);
  },

  select: (role) => set({ selectedRole: role }),

  setName: (name) => {
    const { config } = get();
    if (!config) return;
    set({ config: { ...config, name } });
  },

  setChainstay: (mm) => {
    const { config } = get();
    if (!config) return;
    const next = { ...config, calibration: { chainstayMm: mm } };
    set({ config: next, result: recompute(next), ...stopAnim });
  },

  setShock: (patch) => {
    const { config } = get();
    if (!config) return;
    const next = { ...config, shock: { ...config.shock, ...patch } };
    set({ config: next, result: recompute(next), ...stopAnim });
  },

  setDrivetrain: (patch) => {
    const { config } = get();
    if (!config) return;
    const base = config.drivetrain ?? { chainringT: 32, cogT: 52 };
    const next = { ...config, drivetrain: { ...base, ...patch } };
    set({ config: next, result: recompute(next), ...stopAnim });
  },

  setPrecision: (on) => set({ precision: on }),
  setCtrl: (on) => set({ ctrlHeld: on }),
  setReadOnly: (on) => set({ readOnly: on }),

  loadConfig: (config) =>
    set({
      config: { ...config, coincident: config.coincident ?? [] },
      result: recompute(config),
      selectedRole: null,
      ...stopAnim,
    }),

  playAnimation: () => {
    const { config } = get();
    if (!config) return;
    let r: SolveResult | null = null;
    try {
      r = solve(config, 60, { withFrames: true });
    } catch {
      r = null;
    }
    if (!r || !r.frames || r.frames.length === 0) return;
    set({ animFrames: r.frames, animIndex: 0, animating: true });
  },

  stopAnimation: () => set({ animating: false, animIndex: 0 }),
  setAnimIndex: (i) => set({ animIndex: i }),
  setDimImage: (on) => set({ dimImage: on }),
}));
