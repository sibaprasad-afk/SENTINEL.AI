import React, { useEffect, useRef } from 'react';

export type AmbientVariant = 'landing' | 'auth' | 'workspace';

interface AmbientBackgroundProps {
  variant?: AmbientVariant;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ variant = 'workspace' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const nodeCount = variant === 'landing' ? 24 : 18;
    const nodes = Array.from({ length: nodeCount }, (_, idx) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.24,
      vy: (Math.random() - 0.5) * 0.22,
      r: 1.1 + (idx % 3) * 0.5,
      hue: idx % 3 === 0 ? '25, 214, 160' : idx % 3 === 1 ? '50, 217, 232' : '168, 121, 255',
    }));

    let phase = 0;

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      phase += 0.008;

      // Subtle cyan / emerald atmospheric wave ribbon
      ctx.beginPath();
      for (let x = 0; x <= w; x += 28) {
        const y =
          h * (variant === 'landing' ? 0.62 : 0.72) +
          Math.sin(x * 0.004 + phase) * 26 +
          Math.cos(x * 0.002 - phase * 0.7) * 14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(50, 217, 232, 0.07)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Update nodes + draw connecting network lines
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 170) {
            const alpha = (1 - dist / 170) * 0.08;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(50, 217, 232, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.hue}, 0.42)`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [variant]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Deep navy gradient canvas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === 'landing'
              ? 'radial-gradient(ellipse 80% 60% at 72% 18%, rgba(25,214,160,0.12), transparent 60%), radial-gradient(ellipse 65% 55% at 15% 25%, rgba(79,155,255,0.11), transparent 58%), radial-gradient(ellipse 55% 50% at 85% 82%, rgba(168,121,255,0.10), transparent 60%), linear-gradient(165deg, #050814 0%, #090F1E 55%, #050814 100%)'
              : variant === 'auth'
                ? 'radial-gradient(ellipse 70% 60% at 25% 40%, rgba(50,217,232,0.13), transparent 60%), radial-gradient(ellipse 60% 55% at 78% 65%, rgba(168,121,255,0.12), transparent 60%), linear-gradient(165deg, #050814 0%, #090F1E 100%)'
                : 'radial-gradient(ellipse 75% 55% at 80% 10%, rgba(25,214,160,0.09), transparent 58%), radial-gradient(ellipse 60% 50% at 18% 85%, rgba(168,121,255,0.08), transparent 58%), radial-gradient(ellipse 55% 45% at 50% 45%, rgba(50,217,232,0.05), transparent 60%), linear-gradient(165deg, #050814 0%, #090F1E 50%, #050814 100%)',
        }}
      />

      {/* Soft blurred drifting ambient light orbs */}
      <div
        className="animate-orb-a absolute -top-28 right-[12%] h-96 w-96 rounded-full blur-3xl opacity-45"
        style={{ background: 'radial-gradient(circle, rgba(25,214,160,0.22), transparent 70%)' }}
      />
      <div
        className="animate-orb-b absolute bottom-[-10%] left-[8%] h-[420px] w-[420px] rounded-full blur-3xl opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(168,121,255,0.20), transparent 70%)' }}
      />
      <div
        className="absolute top-[38%] left-[44%] h-72 w-72 rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(50,217,232,0.18), transparent 70%)' }}
      />

      {/* Subtle particle & connecting network canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};
