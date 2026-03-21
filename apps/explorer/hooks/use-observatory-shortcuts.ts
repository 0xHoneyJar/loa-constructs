'use client';

import { useEffect, useRef } from 'react';
import { useObservatoryStore } from '@/lib/stores/observatory-store';

interface ShortcutActions {
  onDismiss?: () => void;
  onTriage?: () => void;
  onEscalate?: () => void;
  onResolve?: () => void;
}

/**
 * Keyboard shortcut handler for the observatory.
 * Reads all state from store.getState() inside the handler
 * so the event listener never needs re-registration.
 */
export function useObservatoryShortcuts(actions: ShortcutActions = {}) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Skip when typing in inputs or when global search overlay is open
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target.isContentEditable) return;
      if (document.querySelector('.fixed.inset-0.z-50')) return;

      // Read current state fresh — no stale closures
      const state = useObservatoryStore.getState();
      const {
        focusZone,
        selectedSignalId,
        signalIds,
        selectNext,
        selectPrev,
        setFocusZone,
        clearSelection,
        toggleSelect,
        selectAll,
        setFilter,
      } = state;
      const currentActions = actionsRef.current;

      // Global shortcuts
      if (e.key === 'Escape') {
        e.preventDefault();
        if (focusZone === 'detail') {
          setFocusZone('list');
        } else if (focusZone === 'filters') {
          setFocusZone('list');
        } else {
          clearSelection();
        }
        return;
      }

      // Filter zone
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        if (focusZone !== 'filters') {
          e.preventDefault();
          setFocusZone('filters');
          return;
        }
      }

      // Severity filter shortcuts (1-4)
      if (['1', '2', '3', '4'].includes(e.key) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const severityMap: Record<string, string> = {
          '1': 'critical',
          '2': 'high',
          '3': 'medium',
          '4': 'low',
        };
        const currentSeverity = state.filters.severity;
        const targetSeverity = severityMap[e.key];
        setFilter('severity', currentSeverity === targetSeverity ? null : targetSeverity);
        return;
      }

      // List/detail zone shortcuts
      if (focusZone === 'list' || focusZone === 'detail') {
        switch (e.key) {
          case 'j':
          case 'ArrowDown':
            e.preventDefault();
            if (e.shiftKey) {
              state.extendSelectNext();
            } else {
              selectNext();
            }
            break;
          case 'k':
          case 'ArrowUp':
            e.preventDefault();
            if (e.shiftKey) {
              state.extendSelectPrev();
            } else {
              selectPrev();
            }
            break;
          case 'Enter':
          case 'l':
            if (selectedSignalId && focusZone === 'list') {
              e.preventDefault();
              setFocusZone('detail');
            }
            break;
          case 'x':
            if (selectedSignalId) {
              e.preventDefault();
              toggleSelect(selectedSignalId);
            }
            break;
          case 'a':
            if (e.metaKey || e.ctrlKey) {
              e.preventDefault();
              selectAll(signalIds);
            }
            break;
          case 'd':
            if (selectedSignalId && currentActions.onDismiss) {
              e.preventDefault();
              currentActions.onDismiss();
            }
            break;
          case 't':
            if (selectedSignalId && currentActions.onTriage) {
              e.preventDefault();
              currentActions.onTriage();
            }
            break;
          case 'e':
            if (selectedSignalId && currentActions.onEscalate) {
              e.preventDefault();
              currentActions.onEscalate();
            }
            break;
          case 'r':
            if (selectedSignalId && currentActions.onResolve) {
              e.preventDefault();
              currentActions.onResolve();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Single registration — reads state fresh inside handler
}
