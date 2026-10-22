"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { TeamDTO } from "@/lib/server/services/team.service";
import { TeamLogo } from "./team-logo";
import { useTranslation } from "@/lib/i18n/use-translation";

/**
 * Hover lighting per team — deep crimson for Qartal, warm gold for Buta, very dark navy for
 * Ulduz (kept away from a bright cyan), silver/graphite for Gala. Distinct from each team's
 * stored brand color (used elsewhere for badges) — this is a deliberate lighting design, not a
 * data-driven tint.
 */
const HOVER_GLOW: Record<string, string> = {
  qartal: "#C21323",
  buta: "#E0A526",
  ulduz: "#16223F",
  gala: "#A6ACB4",
};

// Two diagonal light streaks per panel, staggered so they never sweep in lockstep — slow,
// premium motion rather than a fast "shine" swipe.
const STREAKS = [
  { rotate: -24, top: "8%", width: 140, blur: 30, duration: 13, delay: 0 },
  { rotate: -24, top: "48%", width: 90, blur: 22, duration: 17, delay: 5 },
];

// Very small, gently floating particles — subtle depth dust, not rising embers.
const PARTICLES = [
  { left: 22, top: 30, size: 2, duration: 9, delay: 0 },
  { left: 68, top: 22, size: 2, duration: 11, delay: 1.4 },
  { left: 40, top: 62, size: 1.5, duration: 8, delay: 2.8 },
  { left: 78, top: 58, size: 2, duration: 10, delay: 0.6 },
  { left: 15, top: 70, size: 1.5, duration: 12, delay: 3.6 },
  { left: 55, top: 15, size: 2, duration: 9.5, delay: 2 },
];

/**
 * One vertical panel in the Teams club-select screen. Idle: very dark, desaturated, muted
 * logo. Hover: a cinematic lighting rig — ambient glow + tighter spotlight behind the logo,
 * slow diagonal light streaks, a faint drifting haze, gently panning depth gradients, tiny
 * floating particles, and a subtle diagonal reflection across the panel surface. Everything
 * but the reflection sits inside a radially-masked wrapper so it fades out before the panel's
 * rectangular edges instead of reading as a solid color box. Sibling dimming (the other three
 * panels going nearly black) is a single global CSS rule in globals.css.
 */
export function TeamSelectPanel({ team }: { team: TeamDTO }) {
  const { t } = useTranslation();
  const glow = HOVER_GLOW[team.slug] ?? team.colors.accent;

  return (
    <Link
      href={`/teams/${team.slug}`}
      className="team-select-panel group relative flex h-full flex-1 flex-col items-center justify-center overflow-hidden border-r border-border-subtle bg-surface-base outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent transition-transform duration-500 ease-out last:border-r-0 hover:z-10 hover:scale-[1.02] focus-visible:scale-[1.02]"
      style={{ "--panel-glow": glow } as React.CSSProperties}
    >
      {/* Contrast wash — very dark at idle, lifts (but stays moody) on hover. Painted first so the
          screen-blended lighting below glows on top of it, not underneath it. */}
      <div className="pointer-events-none absolute inset-0 bg-surface-base/85 transition-opacity duration-700 ease-out group-hover:opacity-50 group-focus-visible:opacity-50" />

      {/* Lighting rig — masked so it fades naturally before the panel's rectangular edge.
          mask-image defaults to LUMINANCE masking, not alpha: the "visible" stop must be white
          (max luminance), not black (zero luminance masks content out, same as transparent). */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{
          maskImage: "radial-gradient(ellipse 68% 62% at 50% 46%, white 30%, transparent 82%)",
          WebkitMaskImage: "radial-gradient(ellipse 68% 62% at 50% 46%, white 30%, transparent 82%)",
        }}
      >
        {/* Depth — a large, slowly panning gradient layer, gives the lighting a sense of parallax */}
        <div
          className="absolute inset-[-20%] [animation:panel-gradient-shift_16s_ease-in-out_infinite]"
          style={{
            mixBlendMode: "screen",
            opacity: 0.22,
            backgroundImage:
              "radial-gradient(ellipse at 30% 30%, var(--panel-glow) 0%, transparent 55%), radial-gradient(ellipse at 70% 75%, var(--panel-glow) 0%, transparent 50%)",
            backgroundSize: "200% 200%",
          }}
        />

        {/* Faint atmospheric haze — broad, heavily blurred, very low density */}
        <div
          className="absolute inset-[-25%] rounded-full blur-3xl [animation:haze-drift_15s_ease-in-out_infinite]"
          style={{
            mixBlendMode: "screen",
            background: "radial-gradient(ellipse 55% 45% at 50% 55%, var(--panel-glow) 0%, transparent 72%)",
          }}
        />

        {/* Diagonal light streaks, slowly sweeping across the panel */}
        <div className="absolute inset-0" style={{ mixBlendMode: "screen" }}>
          {STREAKS.map((streak, index) => (
            <div
              key={index}
              className="absolute left-0 h-px w-full"
              style={{
                top: streak.top,
                animation: `streak-sweep ${streak.duration}s linear ${streak.delay}s infinite`,
              }}
            >
              <div
                style={{
                  width: streak.width,
                  height: 2,
                  transform: `rotate(${streak.rotate}deg)`,
                  filter: `blur(${streak.blur}px)`,
                  background: "linear-gradient(90deg, transparent 0%, var(--panel-glow) 50%, transparent 100%)",
                }}
              />
            </div>
          ))}
        </div>

        {/* Ambient glow — large, soft, low-intensity wash behind the logo */}
        <div
          className="absolute left-1/2 top-[42%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl [animation:glow-breathe_7s_ease-in-out_infinite]"
          style={{ backgroundColor: "var(--panel-glow)", mixBlendMode: "screen", opacity: 0.35 }}
        />

        {/* Premium spotlight — tighter, brighter core directly behind the logo */}
        <div
          className="absolute left-1/2 top-[42%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl [animation:glow-breathe_5s_ease-in-out_infinite]"
          style={{ backgroundColor: "var(--panel-glow)", mixBlendMode: "screen", opacity: 0.6 }}
        />

        {/* Very small floating particles */}
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className="absolute rounded-full"
            style={
              {
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: particle.size,
                height: particle.size,
                backgroundColor: "var(--panel-glow)",
                boxShadow: "0 0 4px 1px var(--panel-glow)",
                animation: `particle-float ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Subtle reflection on the panel surface — a slow diagonal sheen, spanning the full panel
          rather than fading at the radial mask edge, like light catching a glossy surface. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ mixBlendMode: "overlay" }}
      >
        <div
          className="absolute -top-1/4 h-[150%] w-1/3 [animation:reflection-sweep_10s_ease-in-out_infinite]"
          style={{
            background: "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.16) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6">
        <TeamLogo
          teamSlug={team.slug}
          teamName={team.name}
          size={128}
          className="opacity-60 grayscale transition-all duration-500 ease-out [filter:drop-shadow(0_0_0_transparent)] group-hover:scale-110 group-focus-visible:scale-110 group-hover:opacity-100 group-focus-visible:opacity-100 group-hover:grayscale-0 group-focus-visible:grayscale-0 group-hover:[filter:drop-shadow(0_0_46px_var(--panel-glow))] group-focus-visible:[filter:drop-shadow(0_0_46px_var(--panel-glow))]"
        />

        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground-tertiary transition-colors duration-500 ease-out group-hover:text-foreground-primary group-focus-visible:text-foreground-primary sm:text-3xl">
          {team.name}
        </h2>

        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-foreground-tertiary opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
          {t("common.viewTeam")}
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}
