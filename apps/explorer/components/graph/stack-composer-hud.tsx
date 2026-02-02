'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  Layers,
  Terminal,
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { useGraphStore, type StackHint } from '@/lib/stores/graph-store';
import {
  getCategoryColor,
  getAllCategories,
} from '@/lib/utils/colors';
import { StackPreview } from './stack-preview';
import { GraduationBadge } from '@/components/ui/graduation-badge';
import type { ConstructNode } from '@/lib/types/graph';

interface StackComposerHudProps {
  nodes: ConstructNode[];
}

const HINT_MESSAGES: Record<StackHint, string | null> = {
  none: null,
  focus: 'Consider focusing on specific categories for depth',
  large: 'Large stack — deep expertise in fewer areas often yields better results',
};

function StackItemPill({
  node,
  onRemove,
}: {
  node: ConstructNode;
  onRemove: () => void;
}) {
  const categoryColor = getCategoryColor(node.category);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="group flex items-center gap-1.5 rounded-full px-2 py-0.5"
      style={{
        backgroundColor: `${categoryColor}20`,
        borderWidth: 1,
        borderColor: `${categoryColor}40`,
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: categoryColor }}
      />
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/80">
        {node.name}
      </span>
      <GraduationBadge level={node.graduationLevel} />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100"
        aria-label={`Remove ${node.name} from stack`}
      >
        <X className="h-2.5 w-2.5 text-white/60" />
      </button>
    </motion.div>
  );
}

function CategoryLegend({
  stackNodes,
}: {
  stackNodes: ConstructNode[];
}) {
  const allCategories = getAllCategories();

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of stackNodes) {
      counts.set(node.category, (counts.get(node.category) || 0) + 1);
    }
    return counts;
  }, [stackNodes]);

  return (
    <div className="grid grid-cols-3 gap-1">
      {allCategories.map((category) => {
        const count = categoryCounts.get(category.slug) || 0;
        const color = category.color;
        const label = category.label;

        return (
          <div
            key={category.slug}
            className="flex items-center gap-1.5 rounded px-1.5 py-0.5"
            style={{
              backgroundColor: count > 0 ? `${color}15` : 'transparent',
            }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: color, opacity: count > 0 ? 1 : 0.3 }}
            />
            <span
              className="font-mono text-[9px] uppercase tracking-wider"
              style={{ color: count > 0 ? color : '#ffffff40' }}
            >
              {label}
            </span>
            {count > 0 && (
              <span className="font-mono text-[9px] text-white/40">{count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FloatingToggle({
  count,
  onExpand,
}: {
  count: number;
  onExpand: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onClick={onExpand}
      className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-xl backdrop-blur-md transition-colors hover:bg-surface"
    >
      <ChevronUp className="h-4 w-4 text-white/60" />
      <Layers className="h-4 w-4 text-white/60" />
      <span className="font-mono text-xs uppercase tracking-wider text-white/80">
        Stack
      </span>
      <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-white/60">
        {count}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        Compose
      </span>
    </motion.button>
  );
}

export function StackComposerHud({ nodes }: StackComposerHudProps) {
  const {
    stackNodeIds,
    stackHint,
    isStackHudOpen,
    removeFromStack,
    clearStack,
    setStackHudOpen,
    toggleStackHud,
  } = useGraphStore();
  const [copied, setCopied] = useState(false);

  // Get the actual node objects for items in stack
  const stackNodes = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return Array.from(stackNodeIds)
      .map((id) => nodeMap.get(id))
      .filter((n): n is ConstructNode => n !== undefined);
  }, [nodes, stackNodeIds]);

  // Generate install command
  const installCommand = useMemo(() => {
    if (stackNodes.length === 0) return '';
    const slugs = stackNodes.map((n) => n.slug).join(' ');
    return `/constructs install ${slugs}`;
  }, [stackNodes]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!installCommand) return;
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = installCommand;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [installCommand]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes HUD
      if (e.key === 'Escape' && isStackHudOpen && stackNodeIds.size > 0) {
        setStackHudOpen(false);
        return;
      }

      // Cmd/Ctrl + C copies install command when HUD is open
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && isStackHudOpen && stackNodeIds.size > 0) {
        // Only if no text is selected
        if (!window.getSelection()?.toString()) {
          e.preventDefault();
          handleCopy();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStackHudOpen, stackNodeIds.size, setStackHudOpen, handleCopy]);

  // Don't render if stack is empty
  if (stackNodeIds.size === 0) {
    return null;
  }

  const hintMessage = HINT_MESSAGES[stackHint];

  // Show floating toggle when collapsed
  if (!isStackHudOpen) {
    return (
      <AnimatePresence>
        <FloatingToggle count={stackNodeIds.size} onExpand={() => setStackHudOpen(true)} />
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-4 left-4 right-4 z-20 mx-auto max-w-4xl rounded-lg border border-border bg-background/95 shadow-2xl backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Layers className="h-4 w-4 text-white/60" />
          <span className="font-mono text-xs uppercase tracking-wider text-white/60">
            Your Agent
          </span>
          <span className="font-mono text-sm text-white/40">+</span>
          <span className="font-mono text-xs uppercase tracking-wider text-white/80">
            Constructs Stack
          </span>
          <span className="font-mono text-sm text-white/40">=</span>
          <span className="font-mono text-xs uppercase tracking-wider" style={{ color: getCategoryColor('development') }}>
            Capabilities
          </span>
          <span className="rounded bg-surface px-2 py-0.5 font-mono text-[10px] text-white/60">
            {stackNodeIds.size} {stackNodeIds.size === 1 ? 'construct' : 'constructs'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleStackHud}
            className="rounded p-1 text-white/40 transition-colors hover:bg-surface hover:text-white"
            aria-label="Collapse HUD"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={clearStack}
            className="rounded p-1 text-white/40 transition-colors hover:bg-surface hover:text-red-400"
            aria-label="Clear stack"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 p-4">
        {/* Left column - Category legend */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            Categories
          </span>
          <CategoryLegend stackNodes={stackNodes} />
        </div>

        {/* Center column - Stack items and command */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            Stack Composition
          </span>

          {/* Stack items */}
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {stackNodes.map((node) => (
                <StackItemPill
                  key={node.id}
                  node={node}
                  onRemove={() => removeFromStack(node.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Hint message */}
          <AnimatePresence>
            {hintMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1"
              >
                <p className="font-mono text-[10px] text-amber-400/80">
                  {hintMessage}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Install command */}
          <div className="flex items-center gap-2 rounded-md bg-surface px-3 py-2">
            <Terminal className="h-4 w-4 shrink-0 text-white/40" />
            <code className="flex-1 truncate font-mono text-xs text-white/70">
              {installCommand}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-white/10"
              style={{ color: getCategoryColor('development') }}
              aria-label="Copy install command"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-mono text-[10px] uppercase">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="font-mono text-[10px] uppercase">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column - Stack preview */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            Preview
          </span>
          <div className="flex aspect-square items-center justify-center rounded border border-border bg-surface/50 p-2">
            <StackPreview nodes={stackNodes} />
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-border px-4 py-2">
        <span className="font-mono text-[10px] text-white/30">
          Click nodes to add • <kbd className="rounded border border-border bg-surface px-1">Esc</kbd> collapse • <kbd className="rounded border border-border bg-surface px-1">⌘C</kbd> copy command
        </span>
      </div>
    </motion.div>
  );
}
