import { LoadingSigil } from '@/components/logo/loading-sigil';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[--color-void-base]">
      {/* Vignette — dark edges, the room is unlit except for the sign */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse 60% 55% at 50% 48%,
            transparent 0%,
            oklch(0.04 0.003 250 / 0.4) 60%,
            oklch(0.03 0.002 250 / 0.8) 100%
          )`,
        }}
      />

      {/* Data substrate — faint structural grid behind everything */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(0deg, oklch(0.10 0.008 195 / 0.08) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.10 0.008 195 / 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: `radial-gradient(
            ellipse 50% 50% at 50% 48%,
            black 0%,
            transparent 70%
          )`,
          WebkitMaskImage: `radial-gradient(
            ellipse 50% 50% at 50% 48%,
            black 0%,
            transparent 70%
          )`,
        }}
      />

      {/* The mark — large, centered, commanding */}
      <div className="relative flex flex-col items-center gap-6">
        <LoadingSigil size={148} />
        <p
          className="font-mono uppercase"
          style={{
            fontSize: '0.5625rem',
            letterSpacing: '0.25em',
            color: 'oklch(0.28 0.03 195)',
          }}
        >
          Loading
        </p>
      </div>
    </div>
  );
}
