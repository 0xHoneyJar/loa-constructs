export function PixelKey({ className }: { className?: string }) {
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
      <circle cx="8" cy="15" r="5" />
      <line x1="12" y1="11" x2="21" y2="3" />
      <line x1="17" y1="3" x2="21" y2="3" />
      <line x1="21" y1="3" x2="21" y2="7" />
      <line x1="17" y1="7" x2="17" y2="10" />
    </svg>
  );
}
