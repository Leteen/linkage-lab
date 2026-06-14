'use client';
import { useEditorStore } from '@/store/useEditorStore';
import { ALL_PRESETS, getPreset } from '@/lib/kinematics/presets';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="field-label">{title}</h3>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  unit?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="relative mt-1">
        <input
          type="number"
          className="num-input"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>}
      </div>
    </label>
  );
}

export function Toolbar() {
  const config = useEditorStore((s) => s.config);
  const selectedRole = useEditorStore((s) => s.selectedRole);
  const setSuspensionType = useEditorStore((s) => s.setSuspensionType);
  const setName = useEditorStore((s) => s.setName);
  const setChainstay = useEditorStore((s) => s.setChainstay);
  const setShock = useEditorStore((s) => s.setShock);
  const setDrivetrain = useEditorStore((s) => s.setDrivetrain);
  const select = useEditorStore((s) => s.select);
  const toggleCoincident = useEditorStore((s) => s.toggleCoincident);

  if (!config) return null;
  const preset = getPreset(config.suspensionType);
  const coincident = config.coincident ?? [];
  const selGroup = selectedRole ? coincident.find((g) => g.includes(selectedRole)) : undefined;
  const selRole = preset.roles.find((r) => r.key === selectedRole);

  return (
    <div className="space-y-5">
      <Section title="Bike">
        <input
          className="num-input !font-sans"
          value={config.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bike name"
        />
      </Section>

      <Section title="Suspension design">
        <div className="grid grid-cols-2 gap-2">
          {ALL_PRESETS.map((p) => (
            <button
              key={p.type}
              onClick={() => setSuspensionType(p.type)}
              className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                config.suspensionType === p.type
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border bg-panel-2 text-muted hover:text-foreground'
              }`}
            >
              {p.name.split(' (')[0]}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-muted">{preset.blurb}</p>
      </Section>

      <Section title="Markers">
        <div className="flex flex-wrap gap-1.5">
          {preset.roles.map((r) => (
            <button
              key={r.key}
              onClick={() => select(r.key)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                selectedRole === r.key ? 'border-foreground text-foreground' : 'border-border text-muted hover:text-foreground'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
              {r.label}
            </button>
          ))}
        </div>
      </Section>

      {selectedRole && selRole && (
        <Section title="Coincident node (same bolt)">
          <p className="text-[11px] leading-relaxed text-muted">
            Snap another marker onto{' '}
            <span style={{ color: selRole.color }}>{selRole.label}</span> so they share one point and move
            together. On desktop you can also Shift-click a marker on the photo.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {preset.roles
              .filter((r) => r.key !== selectedRole)
              .map((r) => {
                const linked = !!selGroup && selGroup.includes(r.key);
                return (
                  <button
                    key={r.key}
                    onClick={() => toggleCoincident(selectedRole, r.key)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                      linked ? 'border-accent bg-accent/10 text-foreground' : 'border-border text-muted hover:text-foreground'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.label}
                    {linked && <span className="text-accent">✓</span>}
                  </button>
                );
              })}
          </div>
        </Section>
      )}

      <Section title="Calibration">
        <NumberField label="Chainstay (BB → axle)" value={config.calibration.chainstayMm} onChange={setChainstay} unit="mm" />
      </Section>

      <Section title="Shock">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Eye-to-eye" value={config.shock.eyeToEyeMm} onChange={(v) => setShock({ eyeToEyeMm: v })} unit="mm" />
          <NumberField label="Stroke" value={config.shock.strokeMm} onChange={(v) => setShock({ strokeMm: v })} unit="mm" />
        </div>
      </Section>

      <Section title="Drivetrain (for kickback)">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Chainring" value={config.drivetrain?.chainringT ?? 32} onChange={(v) => setDrivetrain({ chainringT: v })} unit="t" />
          <NumberField label="Rear cog" value={config.drivetrain?.cogT ?? 52} onChange={(v) => setDrivetrain({ cogT: v })} unit="t" />
        </div>
      </Section>
    </div>
  );
}
