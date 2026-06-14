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

export interface EditorState {
  config: BikeConfig | null;
  result: SolveResult | null;
  selectedRole: string | null;

  precision: boolean;
  ctrlHeld: boolean;

  // actions
  initImage: (src: string, width: number, height: number, type?: SuspensionType) => void;
  clearImage: () => void;
  setSuspensionType: (type: SuspensionType) => void;
  movePoint: (role: string, x: number, y: number) => void;
  nudge: (role: string, dx: number, dy: number) => void;
  toggleCoincident: (a: string, b: string) => void;
  select: (role: string | null) => void;
  setName: (name: string) => void;
  setChainstay: (mm: number) => void;
  setShock: (patch: Partial<BikeConfig['shock']>) => void;
  setDrivetrain: (patch: Partial<NonNullable<BikeConfig['drivetrain']>>) => void;
  setPrecision: (on: boolean) => void;
  setCtrl: (on: boolean) => void;
  loadConfig: (config: BikeConfig) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  config: null,
  result: null,
  selectedRole: null,
  precision: false,
  ctrlHeld: false,

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
    set({ config, result: recompute(config), selectedRole: null });
  },

  clearImage: () => set({ config: null, result: null, selectedRole: null }),

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
    set({ config: next, result: recompute(next), selectedRole: null });
  },

  movePoint: (role, x, y) => {
    const { config } = get();
    if (!config) return;
    const px = clamp(x, 0, config.image.width);
    const py = clamp(y, 0, config.image.height);
    const group = (config.coincident ?? []).find((g) => g.includes(role));
    const points = { ...config.points };
    if (group) for (const k of group) points[k] = { x: px, y: py };
    else points[role] = { x: px, y: py };
    const next = { ...config, points };
    set({ config: next, result: recompute(next) });
  },

  toggleCoincident: (a, b) => {
    const { config } = get();
    if (!config || a === b || !config.points[a] || !config.points[b]) return;
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
    set({ config: next, result: recompute(next), selectedRole: a });
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
    set({ config: next, result: recompute(next) });
  },

  setShock: (patch) => {
    const { config } = get();
    if (!config) return;
    const next = { ...config, shock: { ...config.shock, ...patch } };
    set({ config: next, result: recompute(next) });
  },

  setDrivetrain: (patch) => {
    const { config } = get();
    if (!config) return;
    const base = config.drivetrain ?? { chainringT: 32, cogT: 52 };
    const next = { ...config, drivetrain: { ...base, ...patch } };
    set({ config: next, result: recompute(next) });
  },

  setPrecision: (on) => set({ precision: on }),
  setCtrl: (on) => set({ ctrlHeld: on }),

  loadConfig: (config) =>
    set({ config: { ...config, coincident: config.coincident ?? [] }, result: recompute(config), selectedRole: null }),
}));
