'use client';

export function IssuesPanel({
  emptyCategories,
  staleConstructs,
  verificationTiers,
}: {
  emptyCategories: string[];
  staleConstructs: string[];
  verificationTiers: Record<string, number>;
}) {
  const hasIssues = emptyCategories.length > 0 || staleConstructs.length > 0;

  return (
    <div className="border border-void-border bg-void-base p-4">
      <h2 className="font-mono text-[9px] text-bone-muted uppercase tracking-widest mb-3">
        Issues
      </h2>
      <div className="space-y-2">
        {emptyCategories.length > 0 && (
          <div className="font-mono text-[10px] text-graduation-beta">
            empty categories: {emptyCategories.join(', ')}
          </div>
        )}
        {staleConstructs.length > 0 && (
          <div className="font-mono text-[10px] text-graduation-beta">
            stale: {staleConstructs.join(', ')}
          </div>
        )}
        {Object.entries(verificationTiers).map(([tier, count]) => (
          <div key={tier} className="font-mono text-[10px] text-bone-dim">
            {tier.toLowerCase()}: {count as number}
          </div>
        ))}
        {!hasIssues && (
          <div className="font-mono text-[10px] text-bone-dim">No issues detected</div>
        )}
      </div>
    </div>
  );
}
