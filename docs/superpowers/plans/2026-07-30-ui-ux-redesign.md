# UI/UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform CAPI's frontend from a generic, static template into a fluid, polished experience with strong rupestre identity — public pages first, dashboard second.

**Architecture:** Tailwind v4 + CSS custom properties for tokens; dedicated CSS files for animations/rupestre elements. Page-by-page redesign with progressive component extraction. No new dependencies — CSS animations via IntersectionObserver, stroke-dasharray for SVG draw, scroll-snap for mobile carousels.

**Tech Stack:** Next.js 16.2, React 19, Tailwind v4 (PostCSS engine), CSS custom properties, SVG inline animation

**Spec:** `docs/superpowers/specs/2026-07-30-ui-ux-redesign-design.md`
**Mockups:** `.superpowers/brainstorm/289-1785456467/content/` (hero-final.html, navigation-demo.html, destino-roteiro.html, animation-showcase.html)

---

## Task 1: Foundation — CSS Tokens, Animations & Rupestre

**Why:** Every subsequent task depends on consistent tokens. Today colors are hardcoded in ~15 different places (`#C4852A`, `var(--ochre)`, inline hex). Spacing varies between 8px, 12px, 16px, 20px with no system. This task creates the vocabulary all pages will share.

**Impact:** No visual changes yet — this is infrastructure. Existing pages continue working because we extend `globals.css`, not replace it.

**How it works:** CSS custom properties in `globals.css` (already has stone/ochre vars). Tailwind v4 reads CSS vars natively via `@theme` — no config file needed. Animation keyframes in a separate file imported only where needed.

**Files:**
- Modify: `apps/web/app/globals.css`
- Create: `apps/web/src/styles/animations.css`
- Create: `apps/web/src/styles/rupestre.css`

- [ ] **Step 1: Extend globals.css with design tokens**

Add spacing scale, typography scale, shadow levels, and transition presets to the existing CSS variables in `apps/web/app/globals.css`. The file already has `--stone-*` and `--ochre*` vars — extend, don't replace.

```css
/* Add after existing :root vars in globals.css */

@theme {
  /* ── Spacing scale (8px base) ── */
  --spacing-1: 8px;
  --spacing-2: 16px;
  --spacing-3: 24px;
  --spacing-4: 32px;
  --spacing-6: 48px;
  --spacing-8: 64px;
  --spacing-12: 96px;

  /* ── Typography scale ── */
  --text-xs: 0.75rem;    /* 12px — labels, captions */
  --text-sm: 0.875rem;   /* 14px — body small */
  --text-base: 1rem;     /* 16px — body */
  --text-lg: 1.125rem;   /* 18px — body large */
  --text-xl: 1.25rem;    /* 20px — subheadings */
  --text-2xl: 1.75rem;   /* 28px — section titles mobile */
  --text-3xl: 2.5rem;    /* 40px — section titles desktop */
  --text-4xl: 3rem;      /* 48px — hero mobile */
  --text-5xl: 4.5rem;    /* 72px — hero desktop */

  /* ── Shadows (3 levels) ── */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.1);
  --shadow-lg: 0 16px 40px rgba(0,0,0,0.12);

  /* ── Transitions ── */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* ── Brand ── */
  --ochre-bg: rgba(196, 133, 42, 0.08);
  --ochre-glow: rgba(196, 133, 42, 0.15);
}
```

- [ ] **Step 2: Create animations.css**

```css
/* apps/web/src/styles/animations.css */

/* ── Scroll Reveal ── */
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.8s var(--ease-out-expo),
              transform 0.8s var(--ease-out-expo);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger delays for children */
.reveal-stagger > .reveal:nth-child(1) { transition-delay: 0.1s; }
.reveal-stagger > .reveal:nth-child(2) { transition-delay: 0.2s; }
.reveal-stagger > .reveal:nth-child(3) { transition-delay: 0.3s; }
.reveal-stagger > .reveal:nth-child(4) { transition-delay: 0.4s; }
.reveal-stagger > .reveal:nth-child(5) { transition-delay: 0.5s; }
.reveal-stagger > .reveal:nth-child(6) { transition-delay: 0.6s; }

/* ── SVG Stroke Draw ── */
.draw-stroke {
  fill: none;
  stroke: var(--ochre);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: var(--path-length);
  stroke-dashoffset: var(--path-length);
}
.draw-stroke.animate {
  animation: strokeDraw var(--draw-duration, 1s) cubic-bezier(0.65, 0, 0.35, 1) forwards;
  animation-delay: var(--draw-delay, 0s);
}

@keyframes strokeDraw {
  to { stroke-dashoffset: 0; }
}

/* ── Fade Up (text, buttons) ── */
.fade-up {
  opacity: 0;
  transform: translateY(20px);
}
.fade-up.animate {
  animation: fadeUp var(--fade-duration, 1s) var(--ease-out-expo) forwards;
  animation-delay: var(--fade-delay, 0s);
}

@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}

/* ── Dot Pop (circle elements) ── */
.dot-pop {
  opacity: 0;
  transform: scale(0);
}
.dot-pop.animate {
  animation: dotPop 0.5s var(--ease-spring) forwards;
  animation-delay: var(--pop-delay, 0s);
}

@keyframes dotPop {
  0% { opacity: 0; transform: scale(0); }
  70% { opacity: 1; transform: scale(1.3); }
  100% { opacity: 1; transform: scale(1); }
}

/* ── Scroll bounce (scroll hint arrow) ── */
@keyframes scrollBounce {
  0%, 100% { transform: rotate(45deg) translateY(0); opacity: 1; }
  50% { transform: rotate(45deg) translateY(10px); opacity: 0.4; }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .reveal { transition: none; opacity: 1; transform: none; }
  .draw-stroke.animate,
  .fade-up.animate,
  .dot-pop.animate { animation: none; opacity: 1; transform: none; }
  .draw-stroke.animate { stroke-dashoffset: 0; }
}
```

- [ ] **Step 3: Create rupestre.css**

```css
/* apps/web/src/styles/rupestre.css */

/* ── Stone texture overlay ── */
.stone-texture::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E");
  opacity: 0.4;
  pointer-events: none;
}

/* ── Vignette (hero darkening at edges) ── */
.vignette::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
  pointer-events: none;
}

/* ── Organic curve divider ── */
.organic-curve {
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
}

/* ── Ghost figures (background decoration) ── */
.ghost-figure {
  position: absolute;
  fill: var(--ochre);
  opacity: 0.04;
  pointer-events: none;
}
```

- [ ] **Step 4: Verify build succeeds**

Run: `cd apps/web && npx next build 2>&1 | head -30`
Expected: Build completes without errors. No visual changes yet.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/globals.css apps/web/src/styles/animations.css apps/web/src/styles/rupestre.css
git commit -m "feat: design tokens, animation keyframes and rupestre CSS foundation"
```

---

## Task 2: Vectorize Logo SVG from PNG

**Why:** The hero animation draws the logo stroke by stroke. PNG is a raster image — can't animate individual paths. SVG gives us individual `<path>` elements we can animate with `stroke-dasharray`.

**Impact:** New file added. PNG continues to be used everywhere else (nav, footer, favicon, og:image). SVG is only for the hero animation component.

**How it works:** Trace the logo PNG manually into SVG paths. The logo has: 2 human figures (arms up, body, legs), 1 arch/portal, 1 center dot, text "CAPI", tagline. For animation we only need the figures + arch + dot — text is rendered with HTML/CSS.

**Files:**
- Create: `apps/web/public/images/logo-animated.svg`

- [ ] **Step 1: Create SVG tracing the logo**

Open the PNG at `apps/web/public/images/logo.png` (1830×1652px, RGBA transparent). Trace the key elements into a clean SVG with individual path groups for animation control. The viewBox should give comfortable spacing.

Each figure needs separate paths for: head (circle), arms (2 paths), body (1 path), legs (2 paths). The arch needs a single quadratic bezier path. The dot is a circle.

Mark each path with a `data-group` attribute and `data-delay` for animation sequencing:
- Left figure: delay 0.2s
- Right figure: delay 0.4s  
- Arch: delay 1.0s
- Center dot: delay 1.7s

```svg
<!-- apps/web/public/images/logo-animated.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 260" fill="none">
  <!-- Left figure -->
  <g data-group="figure-left">
    <circle cx="72" cy="38" r="11" fill="currentColor" data-delay="0.15"/>
    <path d="M40 100 L56 72 L72 52" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" data-delay="0.3"/>
    <path d="M72 52 L88 72 L104 100" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" data-delay="0.4"/>
    <path d="M72 52 L72 128" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" data-delay="0.6"/>
    <path d="M72 128 L52 180" stroke="currentColor" stroke-width="3" stroke-linecap="round" data-delay="0.85"/>
    <path d="M72 128 L92 180" stroke="currentColor" stroke-width="3" stroke-linecap="round" data-delay="0.9"/>
  </g>

  <!-- Right figure -->
  <g data-group="figure-right">
    <circle cx="248" cy="38" r="11" fill="currentColor" data-delay="0.25"/>
    <path d="M216 100 L232 72 L248 52" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" data-delay="0.35"/>
    <path d="M248 52 L264 72 L280 100" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" data-delay="0.45"/>
    <path d="M248 52 L248 128" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" data-delay="0.65"/>
    <path d="M248 128 L228 180" stroke="currentColor" stroke-width="3" stroke-linecap="round" data-delay="0.9"/>
    <path d="M248 128 L268 180" stroke="currentColor" stroke-width="3" stroke-linecap="round" data-delay="0.95"/>
  </g>

  <!-- Arch -->
  <g data-group="arch">
    <path d="M110 170 Q110 55 160 30 Q210 55 210 170" stroke="currentColor" stroke-width="6" stroke-linecap="round" data-delay="1.2"/>
  </g>

  <!-- Center dot -->
  <g data-group="dot">
    <circle cx="160" cy="112" r="14" fill="currentColor" data-delay="1.7"/>
  </g>
</svg>
```

**Note:** This is an approximation. During implementation, compare against the actual PNG and adjust coordinates to match the real logo proportions exactly. The implementor should open both files side by side and refine paths until the SVG is visually faithful to the PNG.

- [ ] **Step 2: Verify SVG renders correctly**

Open `apps/web/public/images/logo-animated.svg` in a browser. It should show the two figures, arch, and dot in a layout matching the PNG logo (without text — text is handled by HTML).

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/images/logo-animated.svg
git commit -m "feat: vectorized logo SVG for hero animation"
```

---

## Task 3: Home Page Redesign

**Why:** The home page is a 443-line monolith (`apps/web/app/page.tsx`) with embedded `<style>` tag, inline styles, and no animation. It's the first thing tourists see and currently looks like a generic template.

**Impact:** Complete visual overhaul of the home page. Data fetching stays the same. DestinationCard component is reused. New components are created for each section.

**How it works:** Break the monolith into focused components. The page.tsx becomes a thin orchestrator that fetches data and renders section components. Each section is a server component (no client JS needed except the hero animation).

**Files:**
- Create: `apps/web/src/components/home/HeroLogoAnimation.tsx` (client component)
- Create: `apps/web/src/components/home/HeroSection.tsx` (server component)
- Create: `apps/web/src/components/home/DestinationsSection.tsx`
- Create: `apps/web/src/components/home/GuidesSection.tsx`
- Create: `apps/web/src/components/home/CTASection.tsx`
- Create: `apps/web/src/components/home/RupestreSeparator.tsx`
- Create: `apps/web/src/components/home/ScrollRevealProvider.tsx` (client component)
- Modify: `apps/web/app/page.tsx` (rewrite — keep data layer, replace JSX + styles)

- [ ] **Step 1: Create ScrollRevealProvider**

Client component that sets up a single IntersectionObserver for all `.reveal` elements. Used once at the page level — no per-component observers.

```tsx
// apps/web/src/components/home/ScrollRevealProvider.tsx
'use client';

import { useEffect } from 'react';

export default function ScrollRevealProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 2: Create RupestreSeparator**

Reusable SVG separator with rupestre figures. Accepts variant prop for different figure counts/poses.

```tsx
// apps/web/src/components/home/RupestreSeparator.tsx

interface Props {
  variant?: 'single' | 'double';
}

export default function RupestreSeparator({ variant = 'single' }: Props) {
  return (
    <div className="reveal flex items-center justify-center py-8">
      <svg width="300" height="50" viewBox="0 0 300 50" aria-hidden="true">
        <line x1="0" y1="25" x2={variant === 'double' ? 95 : 115} y2="25"
          stroke="var(--stone-300)" strokeWidth="0.8" />

        <g fill="var(--ochre)" opacity="0.4"
           transform={`translate(${variant === 'double' ? 105 : 128}, 4) scale(0.42)`}>
          <circle cx="50" cy="15" r="8" />
          <path d="M30 45 L43 28 L50 22 M50 22 L57 28 L70 45 M50 22 L50 70 M50 70 L35 105 M50 70 L65 105" />
        </g>

        {variant === 'double' && (
          <g fill="var(--ochre)" opacity="0.4" transform="translate(160, 4) scale(0.42)">
            <circle cx="50" cy="15" r="8" />
            <path d="M30 45 L43 28 L50 22 M50 22 L57 28 L70 45 M50 22 L50 70 M50 70 L35 105 M50 70 L65 105" />
          </g>
        )}

        <line x1={variant === 'double' ? 210 : 185} y1="25" x2="300" y2="25"
          stroke="var(--stone-300)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Create HeroLogoAnimation**

Client component with the SVG draw animation. Reads the SVG inline (not as img), calculates path lengths, triggers animation sequence. Uses sessionStorage to skip animation on return visits.

```tsx
// apps/web/src/components/home/HeroLogoAnimation.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export default function HeroLogoAnimation() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    // Skip animation if already seen this session
    if (sessionStorage.getItem('capi-hero-seen')) {
      setShouldAnimate(false);
      // Show everything immediately
      svgRef.current?.querySelectorAll('.draw-stroke, .dot-pop, .head-fill')
        .forEach((el) => el.classList.add('animate'));
      return;
    }

    setShouldAnimate(true);
    sessionStorage.setItem('capi-hero-seen', '1');

    const svg = svgRef.current;
    if (!svg) return;

    // Calculate and set path lengths
    svg.querySelectorAll('.draw-stroke').forEach((path) => {
      const len = (path as SVGPathElement).getTotalLength?.() ?? 500;
      (path as HTMLElement).style.setProperty('--path-length', String(len));
    });

    // Trigger animation classes with delays from data attributes
    svg.querySelectorAll('[data-delay]').forEach((el) => {
      const delay = parseFloat(el.getAttribute('data-delay') ?? '0') * 1000;
      setTimeout(() => el.classList.add('animate'), delay);
    });
  }, []);

  // Reduced motion check
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="mb-8">
      <svg
        ref={svgRef}
        viewBox="0 0 320 260"
        className="w-[280px] h-[240px] md:w-[320px] md:h-[260px]"
        style={{ color: 'var(--ochre)', overflow: 'visible' }}
        aria-label="Logo CAPI animada — figuras rupestres com arco"
      >
        {/* Left figure */}
        <circle className={`head-fill dot-pop ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          cx="72" cy="38" r="11" fill="currentColor" style={{ '--pop-delay': '0.15s' } as React.CSSProperties} data-delay="0.15" />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M40 100 L56 72 L72 52" strokeWidth="3.5" data-delay="0.3"
          style={{ '--draw-duration': '0.8s', '--draw-delay': '0.3s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M72 52 L88 72 L104 100" strokeWidth="3.5" data-delay="0.4"
          style={{ '--draw-duration': '0.8s', '--draw-delay': '0.4s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M72 52 L72 128" strokeWidth="4.5" data-delay="0.6"
          style={{ '--draw-duration': '0.6s', '--draw-delay': '0.6s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M72 128 L52 180" strokeWidth="3" data-delay="0.85"
          style={{ '--draw-duration': '0.5s', '--draw-delay': '0.85s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M72 128 L92 180" strokeWidth="3" data-delay="0.9"
          style={{ '--draw-duration': '0.5s', '--draw-delay': '0.9s' } as React.CSSProperties} />

        {/* Right figure */}
        <circle className={`head-fill dot-pop ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          cx="248" cy="38" r="11" fill="currentColor" style={{ '--pop-delay': '0.25s' } as React.CSSProperties} data-delay="0.25" />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M216 100 L232 72 L248 52" strokeWidth="3.5" data-delay="0.35"
          style={{ '--draw-duration': '0.8s', '--draw-delay': '0.35s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M248 52 L264 72 L280 100" strokeWidth="3.5" data-delay="0.45"
          style={{ '--draw-duration': '0.8s', '--draw-delay': '0.45s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M248 52 L248 128" strokeWidth="4.5" data-delay="0.65"
          style={{ '--draw-duration': '0.6s', '--draw-delay': '0.65s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M248 128 L228 180" strokeWidth="3" data-delay="0.9"
          style={{ '--draw-duration': '0.5s', '--draw-delay': '0.9s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M248 128 L268 180" strokeWidth="3" data-delay="0.95"
          style={{ '--draw-duration': '0.5s', '--draw-delay': '0.95s' } as React.CSSProperties} />

        {/* Arch */}
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M110 170 Q110 55 160 30 Q210 55 210 170" strokeWidth="6" data-delay="1.2"
          style={{ '--draw-duration': '1.2s', '--draw-delay': '1.2s' } as React.CSSProperties} />

        {/* Center dot */}
        <circle className={`dot-pop ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          cx="160" cy="112" r="14" fill="currentColor"
          style={{ '--pop-delay': '1.9s', transformOrigin: '160px 112px' } as React.CSSProperties} data-delay="1.9" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Create HeroSection**

```tsx
// apps/web/src/components/home/HeroSection.tsx
import Link from 'next/link';
import HeroLogoAnimation from './HeroLogoAnimation';
import '@/src/styles/animations.css';
import '@/src/styles/rupestre.css';

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden stone-texture vignette"
      style={{
        height: '100dvh',
        minHeight: '700px',
        background: 'linear-gradient(175deg, #1a1714 0%, var(--stone-900) 30%, var(--stone-800) 70%, #2a2520 100%)',
      }}>

      <div className="relative z-10 text-center flex flex-col items-center">
        <HeroLogoAnimation />

        <h1 className="fade-up animate font-[family-name:var(--font-display)] font-black tracking-[0.15em]"
          style={{
            fontSize: 'clamp(3rem, 6vw, 5rem)',
            color: 'var(--stone-100)',
            '--fade-delay': '2.1s',
          } as React.CSSProperties}>
          CAPI
        </h1>

        <p className="fade-up animate font-light tracking-[0.25em] uppercase mt-2"
          style={{
            fontSize: 'clamp(0.75rem, 1.2vw, 0.95rem)',
            color: 'var(--stone-500)',
            '--fade-delay': '2.5s',
          } as React.CSSProperties}>
          Caminho entre quem explora e quem opera
        </p>

        {/* Divider line */}
        <div className="fade-up animate h-px mx-auto my-7"
          style={{
            width: '120px',
            background: 'linear-gradient(90deg, transparent, var(--ochre), transparent)',
            '--fade-delay': '2.8s',
          } as React.CSSProperties} />

        <div className="fade-up animate" style={{ '--fade-delay': '3.0s' } as React.CSSProperties}>
          <Link href="/destinos"
            className="inline-block px-11 py-4 font-semibold text-base rounded no-underline transition-all duration-300"
            style={{
              background: 'var(--ochre)',
              color: 'var(--stone-50)',
            }}>
            Descobrir destinos
          </Link>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-9 flex flex-col items-center gap-2 fade-up animate"
        style={{ '--fade-delay': '3.4s' } as React.CSSProperties}>
        <span className="text-[11px] tracking-[3px]" style={{ color: 'var(--stone-600)' }}>
          EXPLORE
        </span>
        <div className="w-5 h-5 border-r-[1.5px] border-b-[1.5px]"
          style={{
            borderColor: 'var(--stone-600)',
            animation: 'scrollBounce 2.5s ease infinite',
            transform: 'rotate(45deg)',
          }} />
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create DestinationsSection**

```tsx
// apps/web/src/components/home/DestinationsSection.tsx
import Link from 'next/link';
import DestinationCard from '@/src/components/ui/DestinationCard';

interface Destination {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  state: string;
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
}

interface Props {
  destinations: Destination[];
}

export default function DestinationsSection({ destinations }: Props) {
  if (destinations.length === 0) return null;

  return (
    <section className="py-16 md:py-24 px-5 md:px-12 max-w-[1280px] mx-auto">
      <div className="reveal">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-3"
          style={{ color: 'var(--ochre)' }}>
          Destinos
        </p>
        <div className="flex items-baseline justify-between mb-8 md:mb-12">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight"
            style={{ color: 'var(--stone-800)' }}>
            Onde a natureza te espera
          </h2>
          <Link href="/destinos"
            className="text-sm font-semibold no-underline flex items-center gap-1 shrink-0"
            style={{ color: 'var(--ochre)' }}>
            Ver todos →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 reveal-stagger">
        {destinations.map((d) => (
          <div key={d.id} className="reveal">
            <DestinationCard
              slug={d.slug}
              title={d.title}
              subtitle={d.subtitle}
              state={d.state}
              heroImageUrl={d.heroImageUrl}
              heroImageBlurDataUrl={d.heroImageBlurDataUrl}
              headingLevel="h3"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create GuidesSection**

```tsx
// apps/web/src/components/home/GuidesSection.tsx

export default function GuidesSection() {
  return (
    <section className="relative py-16 md:py-24 px-5 md:px-12 overflow-hidden stone-texture"
      style={{ background: 'var(--stone-900)' }}>

      {/* Ghost figures */}
      <svg className="ghost-figure" style={{ left: '4%', top: '15%', width: '140px' }}
        viewBox="0 0 100 160" aria-hidden="true">
        <path d="M30 35 L50 8 L70 35 M22 52 L50 38 L78 52 M50 38 L50 95 M50 95 L32 140 M50 95 L68 140" />
      </svg>
      <svg className="ghost-figure" style={{ right: '6%', bottom: '10%', width: '110px', transform: 'scaleX(-1)' }}
        viewBox="0 0 100 160" aria-hidden="true">
        <path d="M30 35 L50 8 L70 35 M22 52 L50 38 L78 52 M50 38 L50 95 M50 95 L32 140 M50 95 L68 140" />
      </svg>

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="reveal">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-3"
            style={{ color: 'var(--ochre-light)' }}>
            Guias locais
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight mb-4"
            style={{ color: 'var(--stone-100)' }}>
            Quem conhece de verdade
          </h2>
          <p className="text-lg leading-relaxed max-w-[560px]"
            style={{ color: 'var(--stone-400)' }}>
            Guias nascidos e criados na região. Cada trilha tem uma história, cada pedra tem um nome.
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Create CTASection**

```tsx
// apps/web/src/components/home/CTASection.tsx
import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="text-center py-16 md:py-24 px-5 md:px-12"
      style={{ background: 'linear-gradient(180deg, var(--stone-50) 0%, var(--ochre-bg) 100%)' }}>
      <div className="reveal">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-3"
          style={{ color: 'var(--ochre)' }}>
          Comece agora
        </p>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight max-w-[550px] mx-auto mb-4"
          style={{ color: 'var(--stone-800)' }}>
          Sua próxima aventura começa com um guia local
        </h2>
        <p className="text-lg max-w-[450px] mx-auto"
          style={{ color: 'var(--stone-500)' }}>
          Reserve seu roteiro com pagamento seguro via PIX. Sem complicação.
        </p>
        <Link href="/destinos"
          className="inline-block mt-8 px-12 py-4 font-semibold text-base rounded-md no-underline transition-all duration-300"
          style={{ background: 'var(--ochre)', color: 'white' }}>
          Explorar destinos
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Rewrite page.tsx**

Keep the data layer (imports, fetchDestinations, metadata, dynamic export) and replace all JSX + style tag. The page becomes a thin orchestrator.

The new `page.tsx` should:
1. Keep lines 1-50 (imports, data layer, metadata) exactly as they are
2. Remove the entire `<style>` block (lines 53-338)
3. Replace JSX with section components
4. Import ScrollRevealProvider

```tsx
// apps/web/app/page.tsx — NEW JSX (keep data layer unchanged)

// ... existing imports stay ...
import HeroSection from '@/src/components/home/HeroSection';
import DestinationsSection from '@/src/components/home/DestinationsSection';
import GuidesSection from '@/src/components/home/GuidesSection';
import CTASection from '@/src/components/home/CTASection';
import RupestreSeparator from '@/src/components/home/RupestreSeparator';
import ScrollRevealProvider from '@/src/components/home/ScrollRevealProvider';
import Link from 'next/link';
import Image from 'next/image';

// ... existing data layer, metadata, dynamic stays ...

export default async function HomePage() {
  const destinations = await fetchDestinations();
  const previewDestinations = destinations?.slice(0, 6) ?? [];

  return (
    <ScrollRevealProvider>
      {/* Nav — simplified, desktop only (mobile uses BottomNav from Task 4) */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-10 py-4 transition-all duration-400"
        style={{ background: 'transparent' }}>
        <Link href="/" className="font-[family-name:var(--font-display)] font-bold text-xl tracking-[3px] no-underline"
          style={{ color: 'var(--stone-100)' }}>
          CAPI
        </Link>
        <div className="hidden md:flex items-center gap-7">
          <Link href="/destinos" className="text-sm no-underline transition-colors" style={{ color: 'var(--stone-400)' }}>Destinos</Link>
          <Link href="/explorar" className="text-sm no-underline transition-colors" style={{ color: 'var(--stone-400)' }}>Explorar</Link>
        </div>
      </nav>

      <HeroSection />
      <RupestreSeparator />
      <DestinationsSection destinations={previewDestinations} />
      <RupestreSeparator variant="double" />
      <GuidesSection />
      <CTASection />

      {/* Footer */}
      <footer className="py-12 md:py-16 px-5 md:px-12 text-center"
        style={{ background: 'var(--stone-900)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1280px] mx-auto flex flex-col items-center gap-6">
          <Image src="/images/logo.png" alt="CAPI" width={110} height={99}
            style={{ filter: 'brightness(0) invert(1)', display: 'block' }} />
          <Link href="/login"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold no-underline rounded"
            style={{ border: '1px solid var(--ochre)', color: 'var(--ochre)' }}>
            Acessar painel
          </Link>
          <Link href="/onboarding" className="text-xs no-underline" style={{ color: 'var(--stone-500)' }}>
            Cadastre sua operadora →
          </Link>
          <p className="text-xs" style={{ color: 'var(--stone-600)' }}>
            © {new Date().getFullYear()} CAPI
          </p>
        </div>
      </footer>
    </ScrollRevealProvider>
  );
}
```

- [ ] **Step 9: Verify build and test visually**

Run: `cd apps/web && npx next build 2>&1 | tail -20`

Then start dev server and check:
- Hero animation plays on first load
- Refresh: animation skips (sessionStorage)
- Scroll: sections fade in
- Rupestre separators appear between sections
- Footer matches existing functionality
- Mobile: responsive layout works

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/home/ apps/web/app/page.tsx
git commit -m "feat: home page redesign with animated hero, scroll-reveal sections, rupestre separators"
```

---

## Task 4: Navigation — BottomNav + PublicLayout

**Why:** Mobile users tap a hamburger menu to navigate — this hides options and adds friction. Modern apps use bottom navigation for primary actions (thumb-reachable, always visible). Desktop nav gets polish (blur on scroll, hover animations).

**Impact:** New BottomNav renders on mobile only (CSS media query). PublicLayout wraps public pages with consistent nav structure. No route changes.

**Files:**
- Create: `apps/web/src/components/layout/BottomNav.tsx` (client component)
- Create: `apps/web/src/components/layout/PublicLayout.tsx`
- Modify: `apps/web/src/components/layout/PublicNav.tsx` (add hover animation, blur on scroll)

- [ ] **Step 1: Create BottomNav**

```tsx
// apps/web/src/components/layout/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4h4v4a1 1 0 001 1h3a1 1 0 001-1V10' },
  { href: '/destinos', label: 'Destinos', icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { href: '/explorar', label: 'Explorar', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { href: '/login', label: 'Perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around md:hidden"
      style={{
        background: 'rgba(28, 25, 23, 0.96)',
        backdropFilter: 'blur(12px)',
        padding: '8px 0 env(safe-area-inset-bottom, 20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href}
          className="flex flex-col items-center gap-0.5 no-underline text-[10px] px-3 py-1"
          style={{ color: isActive(item.href) ? 'var(--ochre)' : 'var(--stone-500)' }}>
          <svg width="22" height="22" fill="none" stroke="currentColor"
            strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Create PublicLayout**

```tsx
// apps/web/src/components/layout/PublicLayout.tsx
import BottomNav from './BottomNav';

interface Props {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: Props) {
  return (
    <>
      {children}
      <BottomNav />
      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  );
}
```

- [ ] **Step 3: Wrap home page with PublicLayout**

In `apps/web/app/page.tsx`, wrap the `<ScrollRevealProvider>` content with `<PublicLayout>`.

- [ ] **Step 4: Verify on mobile viewport**

Open dev tools, set viewport to 375px width. Bottom nav should appear with 4 tabs. Active tab highlighted in ochre. Desktop: bottom nav hidden.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/BottomNav.tsx apps/web/src/components/layout/PublicLayout.tsx apps/web/app/page.tsx
git commit -m "feat: mobile bottom navigation + PublicLayout wrapper"
```

---

## Task 5: Destination Page — Organic Curve + Stats + Card Redesign

**Why:** The destination page is the "door" to CAPI's product. Currently uses straight-line separation between hero and content. Organic curve + stats bar + redesigned roteiro cards make it feel like nature, not a template.

**Impact:** Visual overhaul of destination page. Data stays the same. DestinationHero component gets organic curve. New stats bar component.

**Files:**
- Create: `apps/web/src/components/destination/OrganicDivider.tsx`
- Modify: `apps/web/src/components/ui/DestinationHero.tsx` (add organic curve, simplify CSS)
- Modify: `apps/web/app/destinos/[destination-slug]/page.tsx` (add stats bar, wrap sections with reveal)

Steps: Create OrganicDivider SVG component → Add to DestinationHero → Add stats bar to destination page → Add scroll-reveal + rupestre separators → Verify and commit.

- [ ] **Step 1: Create OrganicDivider**

```tsx
// apps/web/src/components/destination/OrganicDivider.tsx

export default function OrganicDivider() {
  return (
    <svg className="organic-curve" viewBox="0 0 1440 60" preserveAspectRatio="none"
      style={{ height: '50px' }} aria-hidden="true">
      <path d="M0 45 Q360 0 720 30 Q1080 60 1440 20 L1440 60 L0 60Z"
        fill="var(--stone-50)" />
    </svg>
  );
}
```

- [ ] **Step 2: Integrate OrganicDivider into DestinationHero**

Add the organic curve at the bottom of the hero section in `DestinationHero.tsx`. Import `OrganicDivider` and render it before the closing `</section>`. Import `rupestre.css`.

- [ ] **Step 3: Add stats bar to destination page**

In `apps/web/app/destinos/[destination-slug]/page.tsx`, add a stats bar below the hero showing roteiro count, guide count, and state. Use Playfair for numbers, ochre color.

- [ ] **Step 4: Add scroll-reveal and separators**

Import `ScrollRevealProvider`, `RupestreSeparator` and `animations.css`. Wrap content sections with `reveal` class. Add rupestre separators between sections.

- [ ] **Step 5: Verify and commit**

```bash
git add apps/web/src/components/destination/ apps/web/src/components/ui/DestinationHero.tsx apps/web/app/destinos/
git commit -m "feat: destination page with organic curve hero, stats bar, scroll-reveal"
```

---

## Task 6: Roteiro Detail — Badges, Guide Card, Floating CTA

**Why:** The roteiro page is where the tourist decides to book. Guide info needs to be prominent. Price and "Reservar" button must be always visible on mobile (floating CTA).

**Impact:** Visual improvements to roteiro detail. FloatingCTA is mobile-only. Guide card gets better visual treatment.

**Files:**
- Create: `apps/web/src/components/roteiro/FloatingCTA.tsx` (client component)
- Modify: `apps/web/app/destinos/[destination-slug]/roteiros/[id]/page.tsx` (badges, layout, floating CTA)

- [ ] **Step 1: Create FloatingCTA**

```tsx
// apps/web/src/components/roteiro/FloatingCTA.tsx
'use client';

interface Props {
  price: string;
  label: string;
  href: string;
}

export default function FloatingCTA({ price, label, href }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 md:hidden"
      style={{
        padding: '12px 20px env(safe-area-inset-bottom, 24px)',
        background: 'rgba(250,250,249,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--stone-200)',
      }}>
      <div className="flex-1">
        <div className="font-[family-name:var(--font-display)] font-bold text-xl"
          style={{ color: 'var(--ochre)' }}>
          {price}
        </div>
        <div className="text-xs" style={{ color: 'var(--stone-500)' }}>{label}</div>
      </div>
      <a href={href}
        className="px-7 py-3 font-semibold text-sm rounded-md no-underline"
        style={{ background: 'var(--ochre)', color: 'white' }}>
        Reservar
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Add badges and floating CTA to roteiro page**

In the roteiro detail page, add duration/difficulty badges overlaying the hero image. Import and render FloatingCTA at the bottom. Add scroll-reveal to content sections.

- [ ] **Step 3: Verify and commit**

```bash
git add apps/web/src/components/roteiro/ apps/web/app/destinos/
git commit -m "feat: roteiro page with badges, improved guide card, floating CTA"
```

---

## Task 7: Guide + Explorar Pages — Apply Tokens

**Why:** Consistency. These pages should use the same visual language (tokens, typography, spacing) without needing a full redesign.

**Impact:** Light-touch token application. No structural changes.

**Files:**
- Modify: `apps/web/app/guias/` pages (apply tokens)
- Modify: `apps/web/app/explorar/page.tsx` (apply tokens)

- [ ] **Step 1: Apply tokens to guide pages**

Replace hardcoded colors and spacing with CSS variables. Use Playfair for headings. Add `reveal` class to sections.

- [ ] **Step 2: Apply tokens to explorar page**

Same treatment — consistent colors, typography, spacing.

- [ ] **Step 3: Verify and commit**

```bash
git add apps/web/app/guias/ apps/web/app/explorar/
git commit -m "feat: apply design tokens to guide and explore pages"
```

---

## Task 8: Painel — Standardized Components

**Why:** Dashboard pages reimplement styles per page — inline `style={{}}` with hardcoded colors, no shared components. This task creates reusable painel components and migrates existing pages to use them.

**Impact:** Visual consistency across all dashboard pages. CAPI identity through ochre accents and Playfair headings. No functionality changes.

**Files:**
- Create: `apps/web/src/components/painel/PainelPageHeader.tsx`
- Create: `apps/web/src/components/painel/PainelMetric.tsx`
- Create: `apps/web/src/components/painel/PainelCard.tsx`
- Create: `apps/web/src/components/painel/PainelEmptyState.tsx`
- Modify: Painel pages to use new components (progressive — one at a time)

- [ ] **Step 1: Create PainelPageHeader**

```tsx
// apps/web/src/components/painel/PainelPageHeader.tsx

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PainelPageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex items-start justify-between mb-6 md:mb-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl"
          style={{ color: 'var(--stone-800)' }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-1" style={{ color: 'var(--stone-500)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create PainelMetric**

```tsx
// apps/web/src/components/painel/PainelMetric.tsx

interface Props {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
}

export default function PainelMetric({ label, value, trend }: Props) {
  const trendColor = trend === 'up' ? 'var(--ochre)' : trend === 'down' ? '#dc2626' : 'var(--stone-500)';

  return (
    <div className="rounded-xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-sm)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--stone-500)' }}>
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] font-bold text-2xl"
        style={{ color: trendColor }}>
        {value}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create PainelCard and PainelEmptyState**

PainelCard: simple white card with shadow and optional title.
PainelEmptyState: centered icon + message + optional CTA button.

- [ ] **Step 4: Migrate one dashboard page to use new components**

Pick the main dashboard page and replace inline styled metrics/headers with the new components. Verify it looks correct.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/painel/
git commit -m "feat: standardized painel components — PageHeader, Metric, Card, EmptyState"
```

---

## Verification

After all 8 tasks:

1. **Build:** `cd apps/web && npx next build` — no errors
2. **Home:** Hero animation plays, scroll-reveal works, mobile responsive
3. **Navigation:** Bottom nav on mobile, desktop nav with hover effects
4. **Destino:** Organic curve, stats bar, card badges visible
5. **Roteiro:** Floating CTA on mobile, guide card prominent
6. **Painel:** Consistent headers and metrics across pages
7. **Accessibility:** `prefers-reduced-motion` disables all animations
8. **Performance:** No new JS dependencies added. Lighthouse score maintained.
