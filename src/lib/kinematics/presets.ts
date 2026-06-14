// Suspension-design presets. Each defines the marker roles (with default
// drop positions + colors) and the mechanism topology mapping those roles onto
// the generic four-bar / single-pivot solver.
import type { MemberId, Pt, SuspensionType } from './types';

export type { MemberId };

export interface MechanismSpec {
  kind: 'fourbar' | 'singlepivot';
  /** Ground pivot of link 1 (also the pivot for single-pivot). */
  g1: string;
  /** Moving pivot of link 1. */
  m1: string;
  /** Ground pivot of link 2 (four-bar only). */
  g2?: string;
  /** Moving pivot of link 2 (four-bar only). */
  m2?: string;
  /** Which member the rear axle is rigidly attached to. */
  axleMember: MemberId;
  /** Which member the moving shock eye is rigidly attached to. */
  shockMember: MemberId;
}

export interface RoleDef {
  key: string;
  label: string;
  color: string;
  /** Default position, normalized 0..1 of image width/height. */
  def: Pt;
}

export interface PresetDef {
  type: SuspensionType;
  name: string;
  blurb: string;
  roles: RoleDef[];
  mech: MechanismSpec;
  /** Role pairs to render as connecting links. */
  links: [string, string][];
  /** Human labels for the members the shock can be attached to. */
  memberLabels: Partial<Record<MemberId, string>>;
}

const COLOR = {
  bb: '#f59e0b',
  axle: '#22d3ee',
  ground: '#a78bfa',
  moving: '#a3e635',
  shock: '#f472b6',
} as const;

// Defaults assume rear wheel on LEFT (most bike photos)
const bb: RoleDef = { key: 'bb', label: 'Bottom bracket', color: COLOR.bb, def: { x: 0.56, y: 0.6 } };
const axle: RoleDef = { key: 'axle', label: 'Rear axle', color: COLOR.axle, def: { x: 0.18, y: 0.58 } };
const shockFrame: RoleDef = { key: 'shockFrame', label: 'Shock eye (frame)', color: COLOR.shock, def: { x: 0.6, y: 0.4 } };

export const PRESETS: Record<SuspensionType, PresetDef> = {
  vpp: {
    type: 'vpp',
    name: 'VPP (Virtual Pivot Point)',
    blurb: 'Two short counter-rotating links. Axle rides the coupler (rear triangle). If the shock frame eye shares a bolt with a link pivot, Shift-click to link them as a coincident node.',
    roles: [
      bb,
      axle,
      { key: 'lowerFront', label: 'Lower link – frame pivot', color: COLOR.ground, def: { x: 0.6, y: 0.62 } },
      { key: 'lowerRear', label: 'Lower link – rear pivot', color: COLOR.moving, def: { x: 0.46, y: 0.6 } },
      { key: 'upperFront', label: 'Upper link – frame pivot', color: COLOR.ground, def: { x: 0.57, y: 0.5 } },
      { key: 'upperRear', label: 'Upper link – rear pivot', color: COLOR.moving, def: { x: 0.44, y: 0.48 } },
      shockFrame,
      { key: 'shockMoving', label: 'Shock eye (link)', color: COLOR.shock, def: { x: 0.5, y: 0.56 } },
    ],
    mech: { kind: 'fourbar', g1: 'lowerFront', m1: 'lowerRear', g2: 'upperFront', m2: 'upperRear', axleMember: 'coupler', shockMember: 'link1' },
    links: [
      ['lowerFront', 'lowerRear'],
      ['upperFront', 'upperRear'],
      ['lowerRear', 'upperRear'],
      ['lowerRear', 'axle'],
      ['upperRear', 'axle'],
      ['shockFrame', 'shockMoving'],
    ],
    memberLabels: { link1: 'Lower link', link2: 'Upper link', coupler: 'Rear triangle' },
  },

  dwlink: {
    type: 'dwlink',
    name: 'Dual Link',
    blurb: 'Twin short links (Giant Maestro, DW-link, etc.). If the shock frame eye shares a bolt with a link pivot, Shift-click to link them as a coincident node — the solver auto-adjusts.',
    roles: [
      bb,
      axle,
      { key: 'lowerFront', label: 'Lower link – frame pivot', color: COLOR.ground, def: { x: 0.58, y: 0.64 } },
      { key: 'lowerRear', label: 'Lower link – rear pivot', color: COLOR.moving, def: { x: 0.44, y: 0.62 } },
      { key: 'upperFront', label: 'Upper link – frame pivot', color: COLOR.ground, def: { x: 0.54, y: 0.5 } },
      { key: 'upperRear', label: 'Upper link – rear pivot', color: COLOR.moving, def: { x: 0.42, y: 0.5 } },
      shockFrame,
      { key: 'shockMoving', label: 'Shock eye (link)', color: COLOR.shock, def: { x: 0.5, y: 0.58 } },
    ],
    mech: { kind: 'fourbar', g1: 'lowerFront', m1: 'lowerRear', g2: 'upperFront', m2: 'upperRear', axleMember: 'coupler', shockMember: 'link1' },
    links: [
      ['lowerFront', 'lowerRear'],
      ['upperFront', 'upperRear'],
      ['lowerRear', 'upperRear'],
      ['lowerRear', 'axle'],
      ['upperRear', 'axle'],
      ['shockFrame', 'shockMoving'],
    ],
    memberLabels: { link1: 'Lower link', link2: 'Upper link', coupler: 'Rear triangle' },
  },

  horst: {
    type: 'horst',
    name: 'Horst-link (4-bar / FSR)',
    blurb: 'Pivot on the chainstay ahead of the axle. Axle rides the chainstay; seatstay is the coupler.',
    roles: [
      bb,
      axle,
      { key: 'mainPivot', label: 'Main pivot (frame)', color: COLOR.ground, def: { x: 0.54, y: 0.58 } },
      { key: 'horstPivot', label: 'Horst pivot (chainstay)', color: COLOR.moving, def: { x: 0.26, y: 0.56 } },
      { key: 'rockerFrame', label: 'Rocker pivot (frame)', color: COLOR.ground, def: { x: 0.5, y: 0.44 } },
      { key: 'rockerSeat', label: 'Rocker–seatstay pivot', color: COLOR.moving, def: { x: 0.4, y: 0.46 } },
      shockFrame,
      { key: 'shockMoving', label: 'Shock eye (rocker)', color: COLOR.shock, def: { x: 0.44, y: 0.44 } },
    ],
    mech: { kind: 'fourbar', g1: 'mainPivot', m1: 'horstPivot', g2: 'rockerFrame', m2: 'rockerSeat', axleMember: 'link1', shockMember: 'link2' },
    links: [
      ['mainPivot', 'horstPivot'],
      ['horstPivot', 'axle'],
      ['horstPivot', 'rockerSeat'],
      ['rockerFrame', 'rockerSeat'],
      ['shockFrame', 'shockMoving'],
    ],
    memberLabels: { link1: 'Chainstay', link2: 'Rocker', coupler: 'Seatstay' },
  },

  fauxbar: {
    type: 'fauxbar',
    name: 'Faux-bar (linkage single-pivot)',
    blurb: 'Pivot on the seatstay above the axle. Axle traces a pure arc about the main pivot.',
    roles: [
      bb,
      axle,
      { key: 'mainPivot', label: 'Main pivot (frame)', color: COLOR.ground, def: { x: 0.54, y: 0.58 } },
      { key: 'seatPivot', label: 'Seatstay pivot (above axle)', color: COLOR.moving, def: { x: 0.22, y: 0.52 } },
      { key: 'rockerFrame', label: 'Rocker pivot (frame)', color: COLOR.ground, def: { x: 0.48, y: 0.44 } },
      { key: 'rockerSeat', label: 'Rocker–seatstay pivot', color: COLOR.moving, def: { x: 0.38, y: 0.46 } },
      shockFrame,
      { key: 'shockMoving', label: 'Shock eye (rocker)', color: COLOR.shock, def: { x: 0.42, y: 0.44 } },
    ],
    mech: { kind: 'fourbar', g1: 'mainPivot', m1: 'seatPivot', g2: 'rockerFrame', m2: 'rockerSeat', axleMember: 'link1', shockMember: 'link2' },
    links: [
      ['mainPivot', 'axle'],
      ['axle', 'seatPivot'],
      ['seatPivot', 'rockerSeat'],
      ['rockerFrame', 'rockerSeat'],
      ['shockFrame', 'shockMoving'],
    ],
    memberLabels: { link1: 'Swingarm', link2: 'Rocker', coupler: 'Seatstay' },
  },

  singlepivot: {
    type: 'singlepivot',
    name: 'Single pivot',
    blurb: 'One main pivot; shock driven directly off the swingarm. Axle traces a pure arc.',
    roles: [
      bb,
      axle,
      { key: 'mainPivot', label: 'Main pivot (frame)', color: COLOR.ground, def: { x: 0.54, y: 0.58 } },
      shockFrame,
      { key: 'shockMoving', label: 'Shock eye (swingarm)', color: COLOR.shock, def: { x: 0.4, y: 0.52 } },
    ],
    mech: { kind: 'singlepivot', g1: 'mainPivot', m1: 'axle', axleMember: 'link1', shockMember: 'link1' },
    links: [
      ['mainPivot', 'axle'],
      ['mainPivot', 'shockMoving'],
      ['shockFrame', 'shockMoving'],
    ],
    memberLabels: { link1: 'Swingarm' },
  },
};

export const ALL_PRESETS: PresetDef[] = Object.values(PRESETS);

export function getPreset(type: SuspensionType): PresetDef {
  return PRESETS[type];
}

/** Members the shock's moving eye can attach to, with human labels. Single-member mechanisms return one. */
export function shockMemberOptions(preset: PresetDef): { id: MemberId; label: string }[] {
  const order: MemberId[] = ['link1', 'coupler', 'link2'];
  return order
    .filter((m) => preset.memberLabels[m])
    .map((m) => ({ id: m, label: preset.memberLabels[m] as string }));
}

/** Initial marker positions (image pixels) for a freshly chosen preset. */
export function defaultPoints(type: SuspensionType, width: number, height: number): Record<string, Pt> {
  const out: Record<string, Pt> = {};
  for (const r of getPreset(type).roles) {
    out[r.key] = { x: r.def.x * width, y: r.def.y * height };
  }
  return out;
}
