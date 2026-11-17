import React, { useEffect, useRef, useState } from 'react';

export interface HeartHotspot {
  id: string;
  label: string;
  territory: string;
  signalMetric: string;
  status: 'Attention' | 'Nominal';
  xPct: number;
  yPct: number;
}

const HOTSPOTS: HeartHotspot[] = [
  {
    id: 'lad',
    label: 'LAD Perfusion Signal',
    territory: 'Anterior-Septal Territory',
    signalMetric: '94% confidence · Synthetic Demo',
    status: 'Attention',
    xPct: 58,
    yPct: 52,
  },
  {
    id: 'aortic',
    label: 'Aortic Arch Flow Index',
    territory: 'Ascending Aorta',
    signalMetric: '1.38 m/s · Nominal',
    status: 'Nominal',
    xPct: 47,
    yPct: 24,
  },
  {
    id: 'lv',
    label: 'LV Myocardial Wall Motion',
    territory: 'Left Ventricular Apex',
    signalMetric: 'LVEF est. 51% · Monitor',
    status: 'Attention',
    xPct: 62,
    yPct: 71,
  },
];

interface HeartHologramProps {
  compact?: boolean;
  selectedHotspotId?: string;
  onSelectHotspot?: (hotspot: HeartHotspot) => void;
}

export const HeartHologram: React.FC<HeartHologramProps> = ({
  compact = false,
  selectedHotspotId,
  onSelectHotspot,
}) => {
  const [activeId, setActiveId] = useState<string>(selectedHotspotId || 'lad');
  const [imgError, setImgError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentId = selectedHotspotId || activeId;
  const activeHotspot = HOTSPOTS.find((h) => h.id === currentId) || HOTSPOTS[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles = Array.from({ length: compact ? 16 : 24 }, (_, idx) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.9 + (idx % 3) * 0.55,
      vy: 0.0005 + (idx % 5) * 0.00018,
      alpha: 0.28 + (idx % 4) * 0.14,
      hue: idx % 3 === 0 ? '50, 217, 232' : idx % 3 === 1 ? '25, 214, 160' : '168, 121, 255',
    }));

    const tick = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.y -= p.vy;
        if (p.y < -0.04) {
          p.y = 1.04;
          p.x = Math.random();
        }
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue}, ${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [compact]);

  const handleSelect = (hotspot: HeartHotspot) => {
    setActiveId(hotspot.id);
    onSelectHotspot?.(hotspot);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl glass-surface glass-glow-cyan ${
        compact ? 'h-[265px] sm:h-[295px]' : 'h-[340px] sm:h-[390px]'
      }`}
    >
      {/* Atmospheric multi-tone radial illumination */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(25,214,160,0.16) 0%, rgba(50,217,232,0.09) 34%, rgba(168,121,255,0.06) 56%, rgba(5,8,20,0.82) 82%)',
        }}
      />

      {/* Precision laboratory floor grid */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(50,217,232,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(168,121,255,0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
        }}
      />

      {/* Concentric holographic scanning rings */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`animate-hologram-spin rounded-full border border-dashed border-[#19D6A0]/30 ${
            compact ? 'h-52 w-52' : 'h-68 w-68'
          }`}
        />
        <div
          className={`animate-hologram-spin-reverse absolute rounded-full border border-[#32D9E8]/25 ${
            compact ? 'h-40 w-40' : 'h-54 w-54'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#A879FF]/20 ${
            compact ? 'h-60 w-60' : 'h-80 w-80'
          }`}
        />
      </div>

      {/* Emitter base glow */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="h-3 w-44 rounded-full bg-[#32D9E8]/25 blur-md" />
        <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-[#19D6A0]/65 to-transparent" />
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Centerpiece Heart Hologram */}
      <div className="relative z-10 flex h-full w-full items-center justify-center p-3">
        <div className="animate-subtle-float relative flex h-full max-h-[90%] aspect-square items-center justify-center">
          {!imgError ? (
            <img
              src="/src/assets/images/heart_hologram_1794899380724.jpg"
              alt="3D holographic anatomical heart visualization with highlighted coronary vessels"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-contain rounded-full mix-blend-screen select-none pointer-events-none"
              style={{
                maskImage: 'radial-gradient(circle at center, black 54%, transparent 82%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 54%, transparent 82%)',
                filter: 'contrast(1.12) saturate(1.15)',
              }}
            />
          ) : (
            <div className="flex h-44 w-44 flex-col items-center justify-center rounded-full border border-[#32D9E8]/35 bg-[#090F1E]/90 text-center">
              <span className="font-mono text-xs text-[#32D9E8]">CARDIAC VOLUMETRIC MODEL</span>
              <span className="mt-1 text-xs text-[#A5B0C7]">Synthetic Demo Hologram</span>
            </div>
          )}

          {/* Sweeping volumetric laser scan */}
          <div className="pointer-events-none absolute inset-6 overflow-hidden rounded-full">
            <div className="animate-scan-sweep h-10 w-full bg-gradient-to-b from-transparent via-[#19D6A0]/25 to-transparent border-b border-[#32D9E8]/60" />
          </div>

          {HOTSPOTS.map((spot) => {
            const isSelected = spot.id === currentId;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => handleSelect(spot)}
                aria-label={`Inspect ${spot.label}`}
                style={{ left: `${spot.xPct}%`, top: `${spot.yPct}%` }}
                className={`group absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19D6A0] ${
                  isSelected ? 'scale-110' : 'hover:scale-110'
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full border transition-colors ${
                    isSelected
                      ? 'border-[#F4F7FF] bg-[#19D6A0] shadow-[0_0_14px_rgba(25,214,160,0.95)]'
                      : 'border-[#32D9E8]/85 bg-[#090F1E]/90 group-hover:bg-[#32D9E8]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Top-left coordinate caption */}
      <div className="pointer-events-none absolute top-3 left-3.5 z-20 flex flex-col">
        <span className="font-mono text-[11px] tracking-wide text-[#32D9E8]">
          3D CARDIAC VOLUMETRIC SCAN
        </span>
        <span className="text-[11px] text-[#A5B0C7]">Synthetic Demo Model · Interactive Nodes</span>
      </div>

      {/* Bottom glass readout */}
      <div className="absolute bottom-3 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/12 bg-[rgba(9,15,30,0.78)] px-3 py-2 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-[#F4F7FF]">
            <span className="truncate">{activeHotspot.label}</span>
            <span className="text-[#77849E]" aria-hidden="true">·</span>
            <span
              className={`font-mono text-[11px] ${
                activeHotspot.status === 'Attention' ? 'text-[#F6BE58]' : 'text-[#19D6A0]'
              }`}
            >
              {activeHotspot.status}
            </span>
          </div>
          <p className="truncate font-mono text-[11px] text-[#A5B0C7]">
            {activeHotspot.territory} · {activeHotspot.signalMetric}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {HOTSPOTS.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => handleSelect(spot)}
              className={`rounded-md px-2 py-1 text-[11px] font-mono transition-colors ${
                spot.id === currentId
                  ? 'bg-[#19D6A0]/18 text-[#19D6A0] border border-[#19D6A0]/45'
                  : 'text-[#A5B0C7] hover:text-[#F4F7FF] border border-transparent'
              }`}
            >
              {spot.id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
