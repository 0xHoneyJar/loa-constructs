import type { Command } from '@/lib/types/graph';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface CommandListProps {
  commands: Command[];
}

export function CommandList({ commands }: CommandListProps) {
  if (commands.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
          Commands
        </h2>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {commands.map((cmd) => (
            <div key={cmd.name} className="flex items-start gap-4 px-4 py-3">
              <code className="shrink-0 font-mono text-sm text-domain-dev">
                {cmd.name}
              </code>
              <p className="text-sm text-white/60">{cmd.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
