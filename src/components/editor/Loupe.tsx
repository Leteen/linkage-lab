'use client';
import { useEffect, useRef } from 'react';

interface LoupeProps {
  img: HTMLImageElement | null;
  /** Centre of the magnified region, in image pixels. */
  cx: number;
  cy: number;
  color: string;
  size?: number;
  zoom?: number;
}

/** A magnifier that renders a zoomed crop of the source image with a crosshair. */
export function Loupe({ img, cx, cy, color, size = 148, zoom = 5 }: LoupeProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !img) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size * dpr;
    cv.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    const src = size / zoom;
    ctx.drawImage(img, cx - src / 2, cy - src / 2, src, src, 0, 0, size, size);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [img, cx, cy, color, size, zoom]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className="rounded-lg border border-border shadow-2xl"
    />
  );
}
