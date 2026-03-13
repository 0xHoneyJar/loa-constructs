export function PixelCube({ className }: { className?: string }) {
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
      <polyline points="3 8 12 3 21 8" />
      <polyline points="3 8 12 13 21 8" />
      <line x1="3" y1="8" x2="3" y2="16" />
      <line x1="21" y1="8" x2="21" y2="16" />
      <line x1="12" y1="13" x2="12" y2="21" />
      <polyline points="3 16 12 21 21 16" />
    </svg>
  );
}
