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
    <div className="border border-void-border bg-void-raised/50 p-4 space-y-4">
      <h2 className="font-mono text-base font-semibold uppercase tracking-terminal text-bone-base">
        Identity
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {archetype && (
          <div>
            <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
              Archetype
            </span>
            <p className="mt-1 text-lg text-bone-dim">{archetype}</p>
          </div>
        )}

        {frame && (
          <div>
            <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
              Cognitive Frame
            </span>
            <p className="mt-1 text-lg text-bone-dim">{frame}</p>
          </div>
        )}

        {tone && (
          <div>
            <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
              Voice
            </span>
            <p className="mt-1 text-lg text-bone-dim">{tone}</p>
          </div>
        )}

        {domains && domains.length > 0 && (
          <div className={!archetype && !frame && !tone ? 'sm:col-span-2' : ''}>
            <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
              Expertise
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {domains.map((domain) => (
                <span
                  key={domain}
                  className="border border-void-border bg-void-surface px-2 py-0.5 font-mono text-sm text-bone-muted"
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
