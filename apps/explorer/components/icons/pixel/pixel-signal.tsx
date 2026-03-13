export function PixelSignal({ className }: { className?: string }) {
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
      <line x1="12" y1="21" x2="12" y2="10" />
      <path d="M8 7 L12 3 L16 7" />
      <path d="M5 10 L12 3 L19 10" />
      <path d="M2 13 L12 3 L22 13" />
    </svg>
  );
}
