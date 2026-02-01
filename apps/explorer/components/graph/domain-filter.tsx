'use client';

import { useGraphStore } from '@/lib/stores/graph-store';
import type { Domain, DomainStats } from '@/lib/types/graph';

const DOMAIN_COLORS: Record<Domain, string> = {
  gtm: '#FF44FF',
  dev: '#44FF88',
  security: '#FF8844',
  analytics: '#FFDD44',
  docs: '#44DDFF',
  ops: '#4488FF',
};

interface DomainFilterProps {
  domains: DomainStats[];
}

export function DomainFilter({ domains }: DomainFilterProps) {
  const { activeDomains, toggleDomain, setAllDomains } = useGraphStore();
  const allActive = activeDomains.size === domains.length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide sm:flex-wrap sm:overflow-visible sm:pb-0">
      <button
        type="button"
        onClick={() => setAllDomains(!allActive)}
        className="rounded-md bg-surface/50 px-2 py-1 font-mono text-xs uppercase tracking-wider text-white/60 transition-colors hover:bg-surface hover:text-white"
      >
        {allActive ? 'Clear' : 'All'}
      </button>

      {domains.map((domain) => {
        const isActive = activeDomains.has(domain.id);
        const color = DOMAIN_COLORS[domain.id];

        return (
          <button
            key={domain.id}
            type="button"
            onClick={() => toggleDomain(domain.id)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs uppercase tracking-wider transition-all"
            style={{
              backgroundColor: isActive ? `${color}20` : 'transparent',
              color: isActive ? color : '#ffffff60',
              borderWidth: 1,
              borderColor: isActive ? color : 'transparent',
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: isActive ? color : '#ffffff30',
              }}
            />
            <span className="whitespace-nowrap">{domain.label}</span>
            <span className="hidden text-white/40 sm:inline">({domain.count})</span>
          </button>
        );
      })}
    </div>
  );
}
