'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KImage, Group, Circle, Line, Rect, Text } from 'react-konva';
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

const isShockPair = (a: string, b: string) =>
  (a === 'shockFrame' && b === 'shockMoving') || (a === 'shockMoving' && b === 'shockFrame');

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
  const readOnly = useEditorStore((s) => s.readOnly);
  const movePoint = useEditorStore((s) => s.movePoint);
  const moveShock = useEditorStore((s) => s.moveShock);
  const select = useEditorStore((s) => s.select);
  const nudge = useEditorStore((s) => s.nudge);
  const toggleCoincident = useEditorStore((s) => s.toggleCoincident);
  const setCtrl = useEditorStore((s) => s.setCtrl);
  const setPrecision = useEditorStore((s) => s.setPrecision);

  const animating = useEditorStore((s) => s.animating);
  const animFrames = useEditorStore((s) => s.animFrames);
  const animIndex = useEditorStore((s) => s.animIndex);
  const dimImage = useEditorStore((s) => s.dimImage);
  const playAnimation = useEditorStore((s) => s.playAnimation);
  const stopAnimation = useEditorStore((s) => s.stopAnimation);
  const setAnimIndex = useEditorStore((s) => s.setAnimIndex);
  const setDimImage = useEditorStore((s) => s.setDimImage);
  const [playing, setPlaying] = useState(true);

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
    if (!config) return;
    // Wait for the image to load, unless there is no image (URL-shared config with no photo).
    if (!img && config.image.src) return;
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

  // Ping-pong the shock through its stroke while playing.
  useEffect(() => {
    if (!animating || !playing || !animFrames || animFrames.length < 2) return;
    const max = animFrames.length - 1;
    const periodMs = 1600; // one direction (topout → bottom-out)
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const phase = ((now - start) % (periodMs * 2)) / periodMs; // 0..2
      const tri = phase <= 1 ? phase : 2 - phase; // 0..1..0
      setAnimIndex(Math.round(tri * max));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animating, playing, animFrames, setAnimIndex]);

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

  // Active marker positions: animation frame when playing, else the authored points.
  const pts = (animating && animFrames ? animFrames[animIndex] : config.points) ?? config.points;
  const dim = animating || dimImage;
  const editable = !animating && !readOnly;
  const animMax = animFrames ? animFrames.length - 1 : 0;
  const animFrac = animMax > 0 ? animIndex / animMax : 0;
  const animStep =
    result && result.steps.length > 1
      ? result.steps[Math.round(animFrac * (result.steps.length - 1))]
      : null;

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

          {/* Darken the photo for contrast (always during animation). */}
          {dim && (
            <Rect
              x={0}
              y={0}
              width={config.image.width}
              height={config.image.height}
              fill="rgba(7,9,13,0.6)"
              listening={false}
            />
          )}

          {preset.links
            .filter(([a, b]) => !isShockPair(a, b))
            .map(([a, b], i) => {
              const pa = pts[a];
              const pb = pts[b];
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

          {/* Shock: thick body (can) + thin exposed shaft that retracts under compression. */}
          {(() => {
            const a = pts.shockFrame;
            const b = pts.shockMoving;
            if (!a || !b) return null;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const L = Math.hypot(dx, dy);
            const mmpp = result?.mmPerPixel ?? 0;
            const e2e = config.shock.eyeToEyeMm;
            const stroke = config.shock.strokeMm;
            if (L < 1e-3 || mmpp <= 0 || e2e <= 0) {
              return (
                <Line
                  points={[a.x, a.y, b.x, b.y]}
                  stroke="#f472b6"
                  strokeWidth={lineW}
                  dash={[6 / view.scale, 4 / view.scale]}
                  listening={false}
                />
              );
            }
            const ux = dx / L;
            const uy = dy / L;
            const bodyPx = clamp((e2e - stroke) / mmpp, 0, L);
            const shaftPx = L - bodyPx; // shrinks as shock compresses
            const sx = a.x + ux * shaftPx;
            const sy = a.y + uy * shaftPx;
            return (
              <>
                <Line points={[a.x, a.y, sx, sy]} stroke="#fbcfe8" strokeWidth={3.5 / view.scale} lineCap="round" listening={false} />
                <Line points={[sx, sy, b.x, b.y]} stroke="#f472b6" strokeWidth={9 / view.scale} opacity={0.9} lineCap="round" listening={false} />
              </>
            );
          })()}

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
            const p = pts[role.key];
            if (!p) return null;
            const isSel = selectedRole === role.key;
            const grp = coincident.find((g) => g.includes(role.key));
            const gidx = grp ? grp.indexOf(role.key) : 0;
            const isShockEye = role.key === 'shockFrame' || role.key === 'shockMoving';
            return (
              <Group
                key={role.key}
                x={p.x}
                y={p.y}
                draggable={editable}
                dragBoundFunc={(pos) => {
                  // Step 1: precision slowdown (screen coords).
                  let p = (ctrlHeld || precision) && dragStart.current
                    ? {
                        x: dragStart.current.x + (pos.x - dragStart.current.x) * PRECISION_FACTOR,
                        y: dragStart.current.y + (pos.y - dragStart.current.y) * PRECISION_FACTOR,
                      }
                    : pos;
                  // Step 2: pin shock length — project shockMoving onto the circle around shockFrame.
                  // Doing this in dragBoundFunc (screen coords) avoids a fight between Konva's
                  // internal drag anchor and React's re-render with the projected position.
                  if (isShockEye && role.key === 'shockMoving') {
                    const mmpp = result?.mmPerPixel ?? 0;
                    const e2e = config.shock.eyeToEyeMm;
                    if ((config.shock.lockLength ?? true) && mmpp > 0 && e2e > 0) {
                      const sf = config.points.shockFrame;
                      const sfAbs = { x: sf.x * view.scale + view.x, y: sf.y * view.scale + view.y };
                      const Rabs = (e2e / mmpp) * view.scale;
                      const dx = p.x - sfAbs.x;
                      const dy = p.y - sfAbs.y;
                      const d = Math.hypot(dx, dy) || 1;
                      p = { x: sfAbs.x + (dx / d) * Rabs, y: sfAbs.y + (dy / d) * Rabs };
                    }
                  }
                  return p;
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
                  if (isShockEye) moveShock(role.key, nx, ny);
                  else movePoint(role.key, nx, ny);
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

      {/* Animation controls */}
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-panel/85 px-3 py-2 backdrop-blur">
        {!animating ? (
          <button
            onClick={() => {
              setPlaying(true);
              playAnimation();
            }}
            className="rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/25"
            title="Cycle the suspension through its travel"
          >
            ▶ Animate
          </button>
        ) : (
          <>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="w-9 rounded-lg border border-border bg-panel-2 py-1.5 text-sm text-foreground transition hover:border-accent hover:text-accent"
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? '⏸' : '▶'}
            </button>
            <input
              type="range"
              min={0}
              max={animMax}
              value={animIndex}
              onChange={(e) => {
                setPlaying(false);
                setAnimIndex(Number(e.target.value));
              }}
              className="w-32 accent-[var(--accent)] sm:w-40"
              aria-label="Scrub travel"
            />
            <span className="mono hidden min-w-[96px] text-right text-[11px] text-muted sm:inline">
              {animStep ? `${animStep.wheelTravelMm.toFixed(0)}mm · shk ${animStep.shockTravelMm.toFixed(0)}mm` : ''}
            </span>
            <button
              onClick={() => {
                setPlaying(false);
                stopAnimation();
              }}
              className="rounded-lg border border-border bg-panel-2 px-2.5 py-1.5 text-[11px] text-muted transition hover:border-red-700 hover:text-red-400"
            >
              Exit
            </button>
          </>
        )}
      </div>

      {/* Controls overlay */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2">
        {!animating && (
          <div className="flex gap-2">
            <button
              onClick={() => setDimImage(!dimImage)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur transition ${
                dimImage ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-panel/80 text-muted hover:text-foreground'
              }`}
              title="Darken the photo for contrast"
            >
              Dim {dimImage ? 'on' : 'off'}
            </button>
            <button
              onClick={() => setPrecision(!precision)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur transition ${
                precision ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-panel/80 text-muted hover:text-foreground'
              }`}
              title="Slow, magnified dragging for fine placement (or hold Ctrl)"
            >
              Precision {precision ? 'on' : 'off'}
            </button>
          </div>
        )}
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
