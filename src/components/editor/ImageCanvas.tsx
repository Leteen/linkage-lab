'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KImage, Group, Circle, Line, Text } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '@/store/useEditorStore';
import { getPreset } from '@/lib/kinematics/presets';
import { useImage } from '@/lib/useImage';
import { Loupe } from './Loupe';

const MIN_SCALE = 0.03;
const MAX_SCALE = 40;
const PRECISION_FACTOR = 0.18;
const HANDLE_R = 7;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

interface View {
  scale: number;
  x: number;
  y: number;
}

export default function ImageCanvas() {
  const config = useEditorStore((s) => s.config);
  const result = useEditorStore((s) => s.result);
  const selectedRole = useEditorStore((s) => s.selectedRole);
  const precision = useEditorStore((s) => s.precision);
  const ctrlHeld = useEditorStore((s) => s.ctrlHeld);
  const movePoint = useEditorStore((s) => s.movePoint);
  const select = useEditorStore((s) => s.select);
  const nudge = useEditorStore((s) => s.nudge);
  const toggleCoincident = useEditorStore((s) => s.toggleCoincident);
  const setCtrl = useEditorStore((s) => s.setCtrl);
  const setPrecision = useEditorStore((s) => s.setPrecision);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const initializedFor = useRef<string | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);

  const [loupe, setLoupe] = useState<{ visible: boolean; cx: number; cy: number; color: string }>(
    { visible: false, cx: 0, cy: 0, color: '#22d3ee' },
  );

  const img = useImage(config?.image.src);
  const preset = config ? getPreset(config.suspensionType) : null;

  // Track container size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Fit the image when it (re)loads.
  const fit = useMemo(
    () => () => {
      if (!config) return;
      const { width: iw, height: ih } = config.image;
      const s = Math.min(size.w / iw, size.h / ih) * 0.92;
      setView({ scale: s, x: (size.w - iw * s) / 2, y: (size.h - ih * s) / 2 });
    },
    [config, size.w, size.h],
  );

  useEffect(() => {
    if (!config || !img) return;
    if (initializedFor.current !== config.image.src || size.w === 0) {
      initializedFor.current = config.image.src;
      fit();
    }
  }, [config, img, fit, size.w]);

  // Keyboard: Ctrl toggles precision/loupe, arrows nudge the selected marker.
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'Control') setCtrl(true);
      const sel = useEditorStore.getState().selectedRole;
      if (!sel) return;
      const step = e.shiftKey ? 0.25 : e.altKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;
      e.preventDefault();
      nudge(sel, dx, dy);
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key === 'Control') setCtrl(false);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [nudge, setCtrl]);

  const zoomBy = (factor: number) => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const oldScale = view.scale;
    const mp = { x: (cx - view.x) / oldScale, y: (cy - view.y) / oldScale };
    const newScale = clamp(oldScale * factor, MIN_SCALE, MAX_SCALE);
    setView({ scale: newScale, x: cx - mp.x * newScale, y: cy - mp.y * newScale });
  };

  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = view.scale;
    const mp = { x: (pointer.x - view.x) / oldScale, y: (pointer.y - view.y) / oldScale };
    const factor = e.evt.deltaY > 0 ? 1 / 1.12 : 1.12;
    const newScale = clamp(oldScale * factor, MIN_SCALE, MAX_SCALE);
    setView({ scale: newScale, x: pointer.x - mp.x * newScale, y: pointer.y - mp.y * newScale });
  };

  const onStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const stage = stageRef.current;
    if (stage && e.target === stage) {
      setView((v) => ({ ...v, x: stage.x(), y: stage.y() }));
    }
  };

  const onTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    const cont = containerRef.current;
    if (!stage || !cont) return;
    stage.draggable(false);
    const rect = cont.getBoundingClientRect();
    const a = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
    const b = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top };
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (!pinch.current) {
      pinch.current = { dist, center };
      return;
    }
    const oldScale = view.scale;
    const mp = { x: (center.x - view.x) / oldScale, y: (center.y - view.y) / oldScale };
    const newScale = clamp(oldScale * (dist / pinch.current.dist), MIN_SCALE, MAX_SCALE);
    setView({ scale: newScale, x: center.x - mp.x * newScale, y: center.y - mp.y * newScale });
    pinch.current = { dist, center };
  };

  const onTouchEnd = () => {
    pinch.current = null;
    stageRef.current?.draggable(true);
  };

  if (!config || !preset) return null;

  const showLoupe = ctrlHeld || precision;
  const r = HANDLE_R / view.scale;
  const lineW = 2 / view.scale;
  const coincident = config.coincident ?? [];

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={view.scale}
        scaleY={view.scale}
        x={view.x}
        y={view.y}
        draggable
        onWheel={onWheel}
        onDragEnd={onStageDragEnd}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) select(null);
        }}
        style={{ cursor: 'grab' }}
      >
        <Layer>
          {img && (
            <KImage image={img} x={0} y={0} width={config.image.width} height={config.image.height} listening={false} />
          )}

          {preset.links.map(([a, b], i) => {
            const pa = config.points[a];
            const pb = config.points[b];
            if (!pa || !pb) return null;
            return (
              <Line
                key={`l${i}`}
                points={[pa.x, pa.y, pb.x, pb.y]}
                stroke="rgba(230,237,243,0.55)"
                strokeWidth={lineW}
                dash={[6 / view.scale, 4 / view.scale]}
                listening={false}
              />
            );
          })}

          {/* Axle path overlay */}
          {result && result.steps.length > 1 && (() => {
            const mmpp = result.mmPerPixel;
            const ih = config.image.height;
            const pts = result.steps.flatMap((s) => [
              s.axle.x / mmpp,
              ih - s.axle.y / mmpp,
            ]);
            return (
              <Line
                points={pts}
                stroke="#a3e635"
                strokeWidth={2 / view.scale}
                opacity={0.85}
                listening={false}
                lineCap="round"
                lineJoin="round"
              />
            );
          })()}

          {preset.roles.map((role) => {
            const p = config.points[role.key];
            if (!p) return null;
            const isSel = selectedRole === role.key;
            const grp = coincident.find((g) => g.includes(role.key));
            const gidx = grp ? grp.indexOf(role.key) : 0;
            return (
              <Group
                key={role.key}
                x={p.x}
                y={p.y}
                draggable
                dragBoundFunc={(pos) => {
                  if (!(ctrlHeld || precision) || !dragStart.current) return pos;
                  return {
                    x: dragStart.current.x + (pos.x - dragStart.current.x) * PRECISION_FACTOR,
                    y: dragStart.current.y + (pos.y - dragStart.current.y) * PRECISION_FACTOR,
                  };
                }}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  // Preserve current selection on Shift-click so onClick can link the two.
                  if (!e.evt.shiftKey) select(role.key);
                }}
                onClick={(e) => {
                  if (e.evt.shiftKey) {
                    const sel = useEditorStore.getState().selectedRole;
                    if (sel && sel !== role.key) toggleCoincident(sel, role.key);
                  }
                }}
                onTouchStart={(e) => {
                  e.cancelBubble = true;
                  select(role.key);
                }}
                onDragStart={(e) => {
                  select(role.key);
                  dragStart.current = e.target.getAbsolutePosition();
                  setLoupe({ visible: ctrlHeld || precision, cx: p.x, cy: p.y, color: role.color });
                }}
                onDragMove={(e) => {
                  const nx = e.target.x();
                  const ny = e.target.y();
                  movePoint(role.key, nx, ny);
                  setLoupe((l) => ({ ...l, visible: ctrlHeld || precision, cx: nx, cy: ny, color: role.color }));
                }}
                onDragEnd={() => {
                  dragStart.current = null;
                  setLoupe((l) => ({ ...l, visible: false }));
                }}
              >
                {/* enlarged invisible hit area */}
                <Circle radius={r * 2.4} fill="rgba(0,0,0,0.01)" />
                {grp && (
                  <Circle
                    radius={r * (1.7 + gidx * 0.85)}
                    stroke={role.color}
                    strokeWidth={lineW}
                    dash={[3 / view.scale, 3 / view.scale]}
                    opacity={0.85}
                  />
                )}
                {isSel && <Circle radius={r * 1.9} stroke={role.color} strokeWidth={lineW} opacity={0.5} />}
                <Circle radius={r} fill={role.color} stroke="#05070a" strokeWidth={lineW} shadowColor={role.color} shadowBlur={isSel ? 12 / view.scale : 0} />
                <Circle radius={r * 0.32} fill="#05070a" />
                {isSel && (
                  <Text
                    text={role.label}
                    x={r * 2.2}
                    y={-r}
                    fontSize={13 / view.scale}
                    fill="#e6edf3"
                    fontStyle="600"
                    shadowColor="#000"
                    shadowBlur={4 / view.scale}
                  />
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Loupe overlay (top-left so it never sits under the finger/cursor) */}
      {showLoupe && loupe.visible && (
        <div className="pointer-events-none absolute left-3 top-3 z-20">
          <Loupe img={img} cx={loupe.cx} cy={loupe.cy} color={loupe.color} />
          <div className="mt-1 text-center text-[10px] uppercase tracking-wider text-muted">precision</div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2">
        <button
          onClick={() => setPrecision(!precision)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur transition ${
            precision ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-panel/80 text-muted hover:text-foreground'
          }`}
          title="Slow, magnified dragging for fine placement (or hold Ctrl)"
        >
          Precision {precision ? 'on' : 'off'}
        </button>
        <div className="flex gap-1.5">
          <CanvasBtn onClick={() => zoomBy(1 / 1.25)} label="−" />
          <CanvasBtn onClick={fit} label="Fit" wide />
          <CanvasBtn onClick={() => zoomBy(1.25)} label="+" />
        </div>
      </div>

      {/* Selected readout */}
      {selectedRole && config.points[selectedRole] && (
        <div className="absolute bottom-3 left-3 z-20 rounded-lg border border-border bg-panel/80 px-3 py-1.5 text-xs backdrop-blur mono">
          <span className="text-muted">{getPreset(config.suspensionType).roles.find((x) => x.key === selectedRole)?.label}</span>
          <span className="ml-2 text-foreground">
            {config.points[selectedRole].x.toFixed(0)}, {config.points[selectedRole].y.toFixed(0)} px
          </span>
        </div>
      )}
    </div>
  );
}

function CanvasBtn({ onClick, label, wide }: { onClick: () => void; label: string; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 rounded-lg border border-border bg-panel/80 text-sm text-foreground backdrop-blur transition hover:border-accent hover:text-accent ${
        wide ? 'px-3' : 'w-8'
      }`}
    >
      {label}
    </button>
  );
}
