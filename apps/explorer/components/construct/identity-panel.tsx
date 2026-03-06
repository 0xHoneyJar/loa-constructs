interface IdentityPanelProps {
  identity: {
    cognitiveFrame?: Record<string, unknown>;
    expertiseDomains?: string[];
    voiceConfig?: Record<string, unknown>;
    modelPreferences?: Record<string, unknown>;
  };
}

function extractString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  return null;
}

export function IdentityPanel({ identity }: IdentityPanelProps) {
  const cognitiveFrame = identity.cognitiveFrame;
  const voice = identity.voiceConfig;
  const domains = identity.expertiseDomains;

  const archetype = cognitiveFrame
    ? extractString(cognitiveFrame, 'archetype', 'role', 'type')
    : null;
  const frame = cognitiveFrame
    ? extractString(cognitiveFrame, 'frame', 'cognitive_frame', 'approach')
    : null;
  const tone = voice
    ? extractString(voice, 'tone', 'style', 'voice')
    : null;

  const hasContent = archetype || frame || tone || (domains && domains.length > 0);
  if (!hasContent) return null;

  return (
    <div className="border border-border bg-surface/50 p-4 space-y-4">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
        Identity
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {archetype && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
              Archetype
            </span>
            <p className="mt-1 text-sm text-white/70">{archetype}</p>
          </div>
        )}

        {frame && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
              Cognitive Frame
            </span>
            <p className="mt-1 text-sm text-white/70">{frame}</p>
          </div>
        )}

        {tone && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
              Voice
            </span>
            <p className="mt-1 text-sm text-white/70">{tone}</p>
          </div>
        )}

        {domains && domains.length > 0 && (
          <div className={!archetype && !frame && !tone ? 'sm:col-span-2' : ''}>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
              Expertise
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {domains.map((domain) => (
                <span
                  key={domain}
                  className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/50"
                >
                  {domain}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
