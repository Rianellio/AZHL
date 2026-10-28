"use client";

import { useEffect, useRef } from "react";
import { HeroLogo } from "./hero-logo";

/**
 * Fills the right ~45-50% of the hero. Central focal element is the official AZHL logo (see
 * hero-logo.tsx), rendered directly with no surrounding card/frame/background — the logo asset
 * itself is alpha-keyed to just the patch's own silhouette (see logo asset comment in
 * hero-logo.tsx), so there is nothing else to visually box it in. Faint, secondary hockey-themed
 * set dressing (rink geometry, ice scratches, a puck trail, light streaks) fills out the rest —
 * all pure CSS/SVG, no external images.
 *
 * Parallax is driven by directly mutating CSS custom properties on refs (no React re-render
 * per mousemove) for performance, and is skipped entirely under prefers-reduced-motion.
 */

const PARTICLES = [
  { left: 15, top: 20, size: "3px", opacity: 0.5, duration: 14, delay: 0 },
  { left: 30, top: 55, size: "2px", opacity: 0.35, duration: 18, delay: 2 },
  { left: 45, top: 15, size: "4px", opacity: 0.4, duration: 16, delay: 1 },
  { left: 60, top: 70, size: "2px", opacity: 0.3, duration: 20, delay: 4 },
  { left: 75, top: 35, size: "3px", opacity: 0.45, duration: 15, delay: 3 },
  { left: 85, top: 60, size: "2px", opacity: 0.3, duration: 19, delay: 1.5 },
  { left: 20, top: 80, size: "3px", opacity: 0.35, duration: 17, delay: 5 },
  { left: 55, top: 40, size: "2px", opacity: 0.4, duration: 13, delay: 2.5 },
];

export function HeroVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let frame = 0;

    function handlePointerMove(event: PointerEvent) {
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const layer of layerRefs.current) {
          if (!layer) continue;
          const depth = Number(layer.dataset.depth ?? 0);
          layer.style.setProperty("--parallax-x", `${x * depth}px`);
          layer.style.setProperty("--parallax-y", `${y * depth}px`);
        }
      });
    }

    function handlePointerLeave() {
      for (const layer of layerRefs.current) {
        layer?.style.setProperty("--parallax-x", "0px");
        layer?.style.setProperty("--parallax-y", "0px");
      }
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    root.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  const setLayerRef = (index: number) => (el: HTMLDivElement | null) => {
    layerRefs.current[index] = el;
  };

  return (
    <div
      ref={rootRef}
      className="absolute inset-y-0 right-0 w-[48%] min-w-[380px] overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={setLayerRef(0)}
        data-depth="4"
        className="absolute -inset-10 bg-[radial-gradient(circle_at_65%_35%,rgba(47,143,255,0.08),transparent_65%)] transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
      />

      <div
        ref={setLayerRef(1)}
        data-depth="8"
        className="absolute -inset-10 opacity-[0.12] transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
      >
        <svg viewBox="0 0 800 800" className="h-full w-full" fill="none">
          <line x1="260" y1="0" x2="260" y2="800" stroke="#2F8FFF" strokeWidth="3" />
          <path d="M 700 620 Q 800 620 800 720" stroke="#F5F5F5" strokeWidth="2" />
        </svg>
      </div>

      <div
        ref={setLayerRef(2)}
        data-depth="14"
        className="absolute -inset-10 opacity-[0.35] transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
      >
        <svg viewBox="0 0 800 800" className="h-full w-full" fill="none">
          <path d="M 60 640 C 220 600 340 560 460 520" stroke="url(#streakGradient)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="470" cy="517" r="8" fill="#0A0A0B" stroke="#2F8FFF" strokeWidth="1.5" />
          <defs>
            <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2F8FFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#2F8FFF" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-[8%]">
        <div
          ref={setLayerRef(3)}
          data-depth="16"
          className="relative w-[80%] max-w-[540px] transition-transform duration-300 ease-out"
          style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
        >
          <HeroLogo />
        </div>
      </div>

      <div
        ref={setLayerRef(4)}
        data-depth="22"
        className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
      >
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className="absolute block rounded-full bg-cyan-100/60 animate-[float-slow_var(--float-duration)_ease-in-out_infinite]"
            style={
              {
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: particle.size,
                height: particle.size,
                opacity: particle.opacity,
                "--float-duration": `${particle.duration}s`,
                animationDelay: `${particle.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}