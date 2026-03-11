export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex gap-2">
          <div className="h-2 w-2 animate-pulse bg-void-raised" />
          <div className="h-2 w-2 animate-pulse bg-void-raised" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 animate-pulse bg-void-raised" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="font-mono text-xs uppercase tracking-wider text-bone-ghost">
          Loading...
        </p>
      </div>
    </div>
  );
}
