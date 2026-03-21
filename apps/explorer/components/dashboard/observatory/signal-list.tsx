'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useObservatoryStore } from '@/lib/stores/observatory-store';
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SignalListItem } from './signal-list-item';
import { BulkActionBar } from './bulk-action-bar';

const ROW_HEIGHT_COMFORTABLE = 36;
const ROW_HEIGHT_COMPACT = 28;
const OVERSCAN = 8;

function getTimeRangeCutoff(timeRange: string | null): number | null {
  if (!timeRange) return null;
  const now = Date.now();
  const ms: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return now - (ms[timeRange] ?? 0);
}

function useRowHeight(): number {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const ctx = document.querySelector('[data-context="dashboard"]');
    setCompact(ctx?.getAttribute('data-density') === 'compact');
    const observer = new MutationObserver(() => {
      setCompact(ctx?.getAttribute('data-density') === 'compact');
    });
    if (ctx) observer.observe(ctx, { attributes: true, attributeFilter: ['data-density'] });
    return () => observer.disconnect();
  }, []);
  return compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_COMFORTABLE;
}

export function SignalList() {
  const {
    filters,
    selectedSignalId,
    selectedSignalIds,
    selectSignal,
    setSignalIds,
    focusZone,
    setFocusZone,
  } = useObservatoryStore();
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allSignals, setAllSignals] = useState<Array<Record<string, unknown>>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowHeight = useRowHeight();

  const result = useQuery(api.signals.byAppPaginated, {
    appSlug: filters.appSlug ?? undefined,
    status: filters.status ?? undefined,
    cursor,
    limit: 50,
  });

  // Reset when filters change
  useEffect(() => {
    setCursor(undefined);
    setAllSignals([]);
  }, [filters.appSlug, filters.status]);

  // Merge paginated results
  useEffect(() => {
    if (result?.signals) {
      if (!cursor) {
        setAllSignals(result.signals as Array<Record<string, unknown>>);
      } else {
        setAllSignals((prev) => {
          const existingIds = new Set(prev.map((s) => s._id));
          const newSignals = (result.signals as Array<Record<string, unknown>>).filter(
            (s) => !existingIds.has(s._id),
          );
          return [...prev, ...newSignals];
        });
      }
    }
  }, [result, cursor]);

  // Apply client-side filters (severity, time range)
  const filteredSignals = useMemo(() => {
    let signals = allSignals;

    if (filters.severity) {
      signals = signals.filter((s) => s.severity === filters.severity);
    }

    const cutoff = getTimeRangeCutoff(filters.timeRange);
    if (cutoff) {
      signals = signals.filter((s) => {
        const ts = new Date(s.timestamp as string).getTime();
        return ts >= cutoff;
      });
    }

    return signals;
  }, [allSignals, filters.severity, filters.timeRange]);

  // Sync signal IDs to store for keyboard navigation
  useEffect(() => {
    setSignalIds(filteredSignals.map((s) => s._id as string));
  }, [filteredSignals, setSignalIds]);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: filteredSignals.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
  });

  // Scroll selected signal into view via virtualizer
  useEffect(() => {
    if (!selectedSignalId) return;
    const idx = filteredSignals.findIndex((s) => s._id === selectedSignalId);
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: 'auto' });
    }
  }, [selectedSignalId, filteredSignals, virtualizer]);

  const handleLoadMore = useCallback(() => {
    if (result?.nextCursor) {
      setCursor(result.nextCursor);
    }
  }, [result]);

  if (result === undefined) {
    return (
      <div className="border-r border-void-border p-2 space-y-1 overflow-y-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-void-raised"
            style={{ height: rowHeight }}
          />
        ))}
      </div>
    );
  }

  if (filteredSignals.length === 0) {
    return (
      <div className="border-r border-void-border flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-[10px] text-bone-muted">
            No signals
          </div>
          <div className="mt-1 font-mono text-[8px] text-bone-ghost">
            {filters.appSlug || filters.severity || filters.status || filters.timeRange
              ? 'Try adjusting your filters'
              : 'Signals will appear when apps send them'}
          </div>
        </div>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="border-r border-void-border flex flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        role="listbox"
        aria-label="Signals"
        aria-activedescendant={selectedSignalId ?? undefined}
        tabIndex={0}
        onFocus={() => setFocusZone('list')}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const signal = filteredSignals[virtualItem.index];
            const id = signal._id as string;
            return (
              <div
                key={id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualItem.size,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <SignalListItem
                  signal={signal}
                  isSelected={selectedSignalId === id}
                  isInBulkSelection={
                    selectedSignalIds.size > 1 && selectedSignalIds.has(id)
                  }
                  isFocused={selectedSignalId === id && focusZone === 'list'}
                  onClick={() => {
                    selectSignal(id);
                    setFocusZone('list');
                  }}
                />
              </div>
            );
          })}
        </div>
        {result.hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            className="w-full p-2 text-center font-mono text-[9px] text-bone-ghost hover:text-bone-muted hover:bg-void-raised transition-colors"
          >
            Load more
          </button>
        )}
      </div>
      <BulkActionBar />
    </div>
  );
}
