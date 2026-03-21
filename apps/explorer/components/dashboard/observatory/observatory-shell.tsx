'use client';

import { useCallback } from 'react';
import { useObservatoryStore } from '@/lib/stores/observatory-store';
import { useObservatoryShortcuts } from '@/hooks/use-observatory-shortcuts';
import { updateSignalStatus, escalateSignal } from '@/app/actions/signal-actions';
import { toast } from 'sonner';
import { PulseStrip } from './pulse-strip';
import { ObservatoryFilters } from './observatory-filters';
import { SignalList } from './signal-list';
import { SignalDetailPanel } from './signal-detail-panel';
import { SovereigntySection } from './sovereignty-section';
import { HealthSection } from './health-section';
import { Disclosure } from '@/components/ui/disclosure';
import { ShortcutReference } from './shortcut-reference';
import { useHealthFavicon } from '@/hooks/use-health-favicon';

export function ObservatoryShell() {
  // Read fresh state inside handlers — no stale closures
  const handleDismiss = useCallback(async () => {
    const { selectedSignalId, selectNext } = useObservatoryStore.getState();
    if (!selectedSignalId) return;
    try {
      await updateSignalStatus(selectedSignalId, 'dismissed');
      toast.success('Signal dismissed');
      selectNext();
    } catch {
      toast.error('Failed to dismiss signal');
    }
  }, []);

  const handleTriage = useCallback(async () => {
    const { selectedSignalId, selectNext } = useObservatoryStore.getState();
    if (!selectedSignalId) return;
    try {
      await updateSignalStatus(selectedSignalId, 'triaged');
      toast.success('Signal triaged');
      selectNext();
    } catch {
      toast.error('Failed to triage signal');
    }
  }, []);

  const handleEscalate = useCallback(async () => {
    const { selectedSignalId, selectNext } = useObservatoryStore.getState();
    if (!selectedSignalId) return;
    try {
      await escalateSignal(selectedSignalId);
      toast.success('Escalated to Linear');
      selectNext();
    } catch {
      toast.error('Failed to escalate signal');
    }
  }, []);

  const handleResolve = useCallback(async () => {
    const { selectedSignalId, selectNext } = useObservatoryStore.getState();
    if (!selectedSignalId) return;
    try {
      await updateSignalStatus(selectedSignalId, 'resolved');
      toast.success('Signal resolved');
      selectNext();
    } catch {
      toast.error('Failed to resolve signal');
    }
  }, []);

  useHealthFavicon();

  useObservatoryShortcuts({
    onDismiss: handleDismiss,
    onTriage: handleTriage,
    onEscalate: handleEscalate,
    onResolve: handleResolve,
  });

  return (
    <div className="flex flex-col -m-6" style={{ height: 'calc(100% + 48px)' }}>
      {/* L0: Pulse Strip */}
      <PulseStrip />

      {/* Filter Bar */}
      <ObservatoryFilters />

      {/* L1: Signal Triage (primary workspace) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[2fr_3fr]">
        <SignalList />
        <SignalDetailPanel />
      </div>

      {/* L2: Health Observatory (collapsible) */}
      <Disclosure title="Health Observatory">
        <HealthSection />
      </Disclosure>

      {/* L3: Sovereignty Intelligence (collapsible) */}
      <Disclosure title="Sovereignty Intelligence">
        <SovereigntySection />
      </Disclosure>

      {/* Shortcut Reference (? key) */}
      <ShortcutReference />
    </div>
  );
}
