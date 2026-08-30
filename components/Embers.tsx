'use client';

import { useEffect, useRef } from 'react';

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
};

/**
 * A canvas layer of embers or gold glints, behind the verdict.
 *
 * Deliberately not a particle library. Two hundred lines of dependency to move
 * eighty dots would be a poor trade, and the whole effect is one integration
 * step per frame.
 *
 * Three things it takes care to get right:
 *
 *   - it respects `prefers-reduced-motion` by drawing one still frame and never
 *     scheduling another, so the texture survives but the movement does not;
 *   - it stops on `visibilitychange`, so a backgrounded tab costs nothing;
 *   - it sizes to `devicePixelRatio` and re-sizes with the element, because a
 *     canvas scaled by CSS is a blurry canvas.
 */
export function Embers({
  tone,
  density = 64,
  className = '',
}: {
  tone: 'ember' | 'gilt';
  density?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Narrow bands on purpose: widen the gilt one and the motes turn chartreuse.
    const hue = tone === 'ember' ? [16, 12] : [38, 14];

    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    let frame = 0;

    const seed = (): Mote => ({
      x: Math.random() * w,
      // Embers rise from the floor; glints fall like leaf from the ceiling.
      y: tone === 'ember' ? h + Math.random() * 60 : -Math.random() * 60,
      vx: (Math.random() - 0.5) * 0.35,
      vy: tone === 'ember' ? -(0.28 + Math.random() * 0.7) : 0.2 + Math.random() * 0.5,
      r: 0.7 + Math.random() * 2.1,
      life: 0,
      max: 190 + Math.random() * 240,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    motes = Array.from({ length: density }, () => {
      const m = seed();
      // Start mid-flight, so the field is already populated on the first frame.
      m.y = Math.random() * h;
      m.life = Math.random() * m.max;
      return m;
    });

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        const fade = 1 - m.life / m.max;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue[0] + Math.random() * hue[1]}, 92%, ${
          tone === 'ember' ? 58 : 72
        }%, ${(0.22 + fade * 0.62).toFixed(3)})`;
        ctx.fill();
      }
    };

    const step = () => {
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        // A slow lateral drift, so nothing travels in a straight line.
        m.vx += (Math.random() - 0.5) * 0.02;
        m.life += 1;
        if (m.life > m.max || m.y < -80 || m.y > h + 80) Object.assign(m, seed());
      }
      draw();
      frame = requestAnimationFrame(step);
    };

    if (still) {
      draw();
    } else {
      frame = requestAnimationFrame(step);
    }

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!still && !document.hidden) frame = requestAnimationFrame(step);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tone, density]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
