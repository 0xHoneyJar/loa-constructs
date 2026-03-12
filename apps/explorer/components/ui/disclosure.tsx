'use client';

import { useState } from 'react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';

interface DisclosureProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function Disclosure({ title, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-void-border">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 font-mono text-base font-semibold uppercase tracking-terminal text-bone-base hover:bg-void-raised transition-colors">
        <span>{title}</span>
        <svg
          className={`h-4 w-4 text-bone-ghost transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4" asChild>
        <div>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
