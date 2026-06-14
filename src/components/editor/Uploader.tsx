'use client';
import { useRef, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

const DEMO_W = 1200;
const DEMO_H = 800;
const DEMO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${DEMO_W}" height="${DEMO_H}" viewBox="0 0 ${DEMO_W} ${DEMO_H}">
<rect width="100%" height="100%" fill="#0b0f15"/>
<g stroke="#16202c" stroke-width="1">${Array.from({ length: 25 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="${DEMO_H}"/>`).join('')}${Array.from({ length: 17 }, (_, i) => `<line x1="0" y1="${i * 50}" x2="${DEMO_W}" y2="${i * 50}"/>`).join('')}</g>
<g fill="none" stroke="#3a4757" stroke-width="10" stroke-linecap="round">
<circle cx="984" cy="470" r="150"/><circle cx="180" cy="470" r="150"/>
<path d="M528 482 L984 470 M528 482 L600 352 L888 452 M600 352 L300 360 L180 470 M300 360 L320 470 M528 482 L300 360"/>
<path d="M600 352 L672 360 L480 322" stroke="#52606f"/>
</g>
<text x="600" y="700" fill="#48566a" font-family="monospace" font-size="22" text-anchor="middle">DEMO BIKE — drag the pivots, or upload your own photo</text>
</svg>`;
const DEMO_URL = `data:image/svg+xml,${encodeURIComponent(DEMO_SVG)}`;

export function Uploader() {
  const initImage = useEditorStore((s) => s.initImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const im = new window.Image();
    im.onload = () => initImage(url, im.naturalWidth, im.naturalHeight);
    im.src = url;
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
            dragOver ? 'border-accent bg-accent/5' : 'border-border bg-panel hover:border-accent/60'
          }`}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-panel-2 text-accent">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 16V4m0 0L8 8m4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </div>
          <p className="text-base font-medium text-foreground">Upload a side-on photo of your bike</p>
          <p className="mt-1 text-sm text-muted">Drag &amp; drop, or tap to choose / take a photo</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => initImage(DEMO_URL, DEMO_W, DEMO_H, 'horst')}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20"
          >
            Try a demo bike
          </button>
        </div>

        <ul className="mt-5 space-y-1.5 text-xs text-muted">
          <li>• Shoot square-on (camera level with the bottom bracket), drive side facing you.</li>
          <li>• Get the whole rear triangle, shock and both axles in frame.</li>
          <li>• You&apos;ll pick a suspension layout and drag the pivots onto the photo next.</li>
        </ul>
      </div>
    </div>
  );
}
