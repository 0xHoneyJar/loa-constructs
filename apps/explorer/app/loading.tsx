export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex gap-2">
          <div className="h-3 w-3 animate-pulse rounded-sm bg-surface" />
          <div className="h-3 w-3 animate-pulse rounded-sm bg-surface" style={{ animationDelay: "150ms" }} />
          <div className="h-3 w-3 animate-pulse rounded-sm bg-surface" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="font-mono text-xs uppercase tracking-wider text-white/40">
          Loading...
        </p>
      </div>
    </div>
  );
}
