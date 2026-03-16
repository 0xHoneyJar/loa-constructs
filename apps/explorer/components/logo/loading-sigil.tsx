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
        {/* L1: LED module grid base — visible pixel structure */}
        {/* At 148px, 7px cells = ~21 modules across. Each module is a lit square
            separated by dark face mask. The mask should be VISIBLE — this is
            what makes it read as an LED billboard, not a flat icon. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: 'oklch(0.06 0.01 195)',
            backgroundImage: `
              linear-gradient(0deg, transparent 60%, oklch(0.03 0.005 195) 60%),
              linear-gradient(90deg, transparent 60%, oklch(0.03 0.005 195) 60%)
            `,
            backgroundSize: `${Math.max(5, Math.round(size / 20))}px ${Math.max(5, Math.round(size / 20))}px`,
          }}
        />

        {/* L2: Power-on — modules lighting bottom-to-top, repeating */}
        <div
          className="absolute inset-0 loading-sigil-poweron"
          style={{
            background: `linear-gradient(
              0deg,
              oklch(0.30 0.10 195) 0%,
              oklch(0.26 0.08 195) 25%,
              oklch(0.18 0.05 195) 55%,
              transparent 100%
            )`,
            backgroundSize: '100% 200%',
          }}
        />

        {/* L3: Scan beam — bright band sweeping up, wider and more visible */}
        <div
          className="absolute inset-0 loading-sigil-scan"
          style={{
            background: `linear-gradient(
              0deg,
              transparent 0%,
              transparent 32%,
              oklch(0.40 0.12 195) 42%,
              oklch(0.45 0.14 195) 50%,
              oklch(0.40 0.12 195) 58%,
              transparent 68%,
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

        {/* L5: Cabinet seam overlay — panel divisions, both axes */}
        {/* Bolder seams every ~24px. Visible structural grid on top of module grid. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                transparent 0px,
                transparent ${Math.round(size / 6) - 2}px,
                oklch(0.02 0.003 195 / 0.7) ${Math.round(size / 6) - 2}px,
                oklch(0.02 0.003 195 / 0.7) ${Math.round(size / 6)}px
              ),
              repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent ${Math.round(size / 4) - 2}px,
                oklch(0.02 0.003 195 / 0.5) ${Math.round(size / 4) - 2}px,
                oklch(0.02 0.003 195 / 0.5) ${Math.round(size / 4)}px
              )
            `,
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
            opacity: 0.5;
          }
          40% {
            background-position: 0% 0%;
            opacity: 0.9;
          }
          70% {
            background-position: 0% 0%;
            opacity: 1;
          }
          85% {
            background-position: 0% 0%;
            opacity: 1;
          }
          100% {
            background-position: 0% 100%;
            opacity: 0.5;
          }
        }

        @keyframes loading-sigil-scan {
          0% { background-position: 0% 100%; }
          100% { background-position: 0% -200%; }
        }

        @keyframes loading-sigil-breath {
          0%, 100% { opacity: 0; }
          40% { opacity: 0.10; }
          60% { opacity: 0.10; }
        }

        @keyframes loading-sigil-glow {
          0%, 100% { opacity: 0.4; }
          40% { opacity: 0.9; }
          60% { opacity: 0.9; }
        }

        .loading-sigil-poweron {
          animation: loading-sigil-poweron 8s steps(12) infinite;
        }

        .loading-sigil-scan {
          animation: loading-sigil-scan 6s linear infinite;
        }

        .loading-sigil-breath {
          animation: loading-sigil-breath 9.7s ease-in-out infinite;
        }

        .loading-sigil-glow {
          animation: loading-sigil-glow 9.7s ease-in-out infinite;
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
