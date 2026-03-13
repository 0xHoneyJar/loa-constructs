export function PixelPulse({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
    >
      <polyline points="2 12 6 12 9 4 12 20 15 8 18 12 22 12" />
    </svg>
  );
}
