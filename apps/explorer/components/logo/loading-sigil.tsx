'use client';

/**
 * Loading Sigil — Horse mark as LED billboard initializing.
 *
 * Walking into a dark room where a large LED sign is powering on.
 * Monumental. Not a spinner.
 *
 * The mark fills space. The LED module grid is visible — same aesthetic
 * as the Three.js sigil. Modules light up progressively from the base,
 * like a display initializing row by row. The environment breathes.
 *
 * CSS only (no Three.js) — loading states can't wait for WebGL.
 * But it must feel like the same world.
 */

export function LoadingSigil({ size = 160 }: { size?: number }) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      {/* Horse mark — LED billboard, masked by the SVG */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: 'url(/horse-mark.svg)',
          WebkitMaskImage: 'url(/horse-mark.svg)',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      >
        {/* L1: LED module grid base — dark structural substrate */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: 'oklch(0.14 0.03 195)',
            backgroundImage: `
              linear-gradient(0deg, transparent 75%, oklch(0.08 0.01 195) 75%),
              linear-gradient(90deg, transparent 75%, oklch(0.08 0.01 195) 75%)
            `,
            backgroundSize: `${Math.max(3, Math.round(size / 40))}px ${Math.max(3, Math.round(size / 40))}px`,
          }}
        />

        {/* L2: Power-on — modules lighting bottom-to-top, repeating */}
        <div
          className="absolute inset-0 loading-sigil-poweron"
          style={{
            background: `linear-gradient(
              0deg,
              oklch(0.25 0.07 195) 0%,
              oklch(0.22 0.06 195) 30%,
              oklch(0.16 0.04 195) 60%,
              transparent 100%
            )`,
            backgroundSize: '100% 200%',
          }}
        />

        {/* L3: Scan beam — single bright band sweeping up through the mark */}
        <div
          className="absolute inset-0 loading-sigil-scan"
          style={{
            background: `linear-gradient(
              0deg,
              transparent 0%,
              transparent 38%,
              oklch(0.35 0.10 195) 46%,
              oklch(0.30 0.08 195 / 0.8) 50%,
              oklch(0.35 0.10 195) 54%,
              transparent 62%,
              transparent 100%
            )`,
            backgroundSize: '100% 400%',
          }}
        />

        {/* L4: Breath — whole mark intensity pulse at PHI ratio */}
        <div
          className="absolute inset-0 loading-sigil-breath"
          style={{
            backgroundColor: 'oklch(0.28 0.08 195)',
            opacity: 0,
          }}
        />

        {/* L5: Cabinet seam overlay — horizontal panel divisions */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent ${Math.round(size / 5) - 1}px,
              oklch(0.06 0.005 195 / 0.5) ${Math.round(size / 5) - 1}px,
              oklch(0.06 0.005 195 / 0.5) ${Math.round(size / 5)}px
            )`,
          }}
        />
      </div>

      {/* Glow — ambient light spill from the LED billboard into the room */}
      <div
        className="absolute loading-sigil-glow"
        style={{
          inset: '-40%',
          background: `radial-gradient(
            ellipse 50% 50% at 50% 50%,
            oklch(0.18 0.06 195 / 0.25) 0%,
            oklch(0.12 0.04 195 / 0.12) 40%,
            transparent 70%
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* Inline keyframes — all animation isolated here */}
      <style>{`
        @keyframes loading-sigil-poweron {
          0% {
            background-position: 0% 100%;
            opacity: 0.6;
          }
          60% {
            background-position: 0% 0%;
            opacity: 1;
          }
          80% {
            background-position: 0% 0%;
            opacity: 1;
          }
          100% {
            background-position: 0% 100%;
            opacity: 0.6;
          }
        }

        @keyframes loading-sigil-scan {
          0% { background-position: 0% 100%; }
          100% { background-position: 0% -200%; }
        }

        @keyframes loading-sigil-breath {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.12; }
        }

        @keyframes loading-sigil-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .loading-sigil-poweron {
          animation: loading-sigil-poweron 3.2s ease-in-out infinite;
        }

        .loading-sigil-scan {
          animation: loading-sigil-scan 2.8s linear infinite;
        }

        .loading-sigil-breath {
          animation: loading-sigil-breath 6.18s ease-in-out infinite;
        }

        .loading-sigil-glow {
          animation: loading-sigil-glow 6.18s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-sigil-poweron,
          .loading-sigil-scan,
          .loading-sigil-breath,
          .loading-sigil-glow {
            animation: none !important;
          }

          .loading-sigil-poweron {
            background-position: 0% 0% !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
