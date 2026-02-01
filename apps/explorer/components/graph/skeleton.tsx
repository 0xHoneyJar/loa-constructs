export function GraphSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 w-3 animate-pulse rounded-sm bg-surface"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p className="font-mono text-xs uppercase tracking-wider text-white/40">
          Loading graph...
        </p>
      </div>
    </div>
  );
}
