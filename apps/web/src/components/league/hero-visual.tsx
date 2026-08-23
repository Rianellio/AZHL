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
      className="absolute inset-y-0 right-0 w-[48%] min-w-[420px] overflow-hidden"
      aria-hidden="true"
    >
      {/* Layer 0 — base wash: near-black-to-black gradient field, barely moves (furthest back) */}
      <div
        ref={setLayerRef(0)}
        data-depth="4"
        className="absolute -inset-10 bg-[radial-gradient(circle_at_60%_30%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(circle_at_80%_75%,rgba(255,255,255,0.03),transparent_55%)] transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
      />

      {/* Layer 1 — faint rink geometry: blue line + goal crease, secondary set dressing. The
          faceoff circle previously here sat directly behind the hero logo and, now that a real
          rectangular logo mark is in place instead of an abstract wordmark, read as a stray
          circular shape rather than intentional set dressing — removed. */}
      <div
        ref={setLayerRef(1)}
        data-depth="9"
        className="absolute -inset-10 opacity-[0.09] transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
      >
        <svg viewBox="0 0 800 800" className="h-full w-full" fill="none">
          <line x1="260" y1="0" x2="260" y2="800" stroke="#3FA7D6" strokeWidth="3" />
          <path d="M 700 620 Q 800 620 800 720" stroke="#F5F5F5" strokeWidth="2" />
        </svg>
      </div>

      {/* Layer 2 — puck trail + light streaks: faint motion cues, kept secondary to the logo */}
      <div
        ref={setLayerRef(2)}
        data-depth="16"
        className="absolute -inset-10 opacity-[0.35] transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
      >
        <svg viewBox="0 0 800 800" className="h-full w-full" fill="none">
          <path d="M 60 640 C 220 600 340 560 460 520" stroke="url(#streakGradient)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="470" cy="517" r="9" fill="#0A0A0B" stroke="#3A3A40" strokeWidth="1.5" />
          <path d="M 120 140 L 420 220" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <path d="M 180 170 L 460 245" stroke="#F5F5F5" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
          <defs>
            <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F5F5F5" stopOpacity="0" />
              <stop offset="100%" stopColor="#F5F5F5" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Layer 3 — ice texture: faint diagonal scratch lines, static (purely textural, no parallax) */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #F5F5F5 0px, #F5F5F5 1px, transparent 1px, transparent 34px)",
        }}
      />

      {/* Layer 4 — the logo: the hero's focal point, rendered directly with no wrapping card,
          background, or border — just the parallax transform and centering. */}
      <div className="absolute inset-0 flex items-center justify-center px-[9%]">
        <div
          ref={setLayerRef(3)}
          data-depth="18"
          className="relative w-[74%] max-w-[560px] transition-transform duration-300 ease-out"
          style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
        >
          <HeroLogo />
        </div>
      </div>

      {/* Layer 5 — light bloom: slow-pulsing soft glows */}
      <div
        ref={setLayerRef(4)}
        data-depth="10"
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
      >
        <div className="absolute right-[15%] top-[18%] h-40 w-40 animate-[bloom-pulse_9s_ease-in-out_infinite] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-[35%] bottom-[15%] h-56 w-56 animate-[bloom-pulse_13s_ease-in-out_infinite] rounded-full bg-accent/5 blur-3xl [animation-delay:3s]" />
      </div>

      {/* Layer 6 — ambient particles, deterministic positions (no Math.random on every render) */}
      <div
        ref={setLayerRef(5)}
        data-depth="30"
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)" }}
      >
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className="absolute block rounded-full bg-foreground-primary/70 animate-[float-slow_var(--float-duration)_ease-in-out_infinite]"
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

interface Particle {
  left: number;
  top: number;
  size: string;
  opacity: number;
  duration: number;
  delay: number;
}

// Deterministic — hand-authored positions so server and client render identically (no
// hydration mismatch, unlike Math.random() would cause).
const PARTICLES: Particle[] = [
  { left: 12, top: 20, size: "3px", opacity: 0.5, duration: 14, delay: 0 },
  { left: 28, top: 55, size: "2px", opacity: 0.35, duration: 18, delay: 2 },
  { left: 45, top: 15, size: "4px", opacity: 0.4, duration: 16, delay: 1 },
  { left: 60, top: 70, size: "2px", opacity: 0.3, duration: 20, delay: 4 },
  { left: 72, top: 35, size: "3px", opacity: 0.45, duration: 15, delay: 3 },
  { left: 85, top: 60, size: "2px", opacity: 0.3, duration: 19, delay: 1.5 },
  { left: 20, top: 80, size: "3px", opacity: 0.35, duration: 17, delay: 5 },
  { left: 55, top: 40, size: "2px", opacity: 0.4, duration: 13, delay: 2.5 },
  { left: 90, top: 20, size: "3px", opacity: 0.4, duration: 21, delay: 0.5 },
  { left: 38, top: 90, size: "2px", opacity: 0.3, duration: 16, delay: 3.5 },
];
