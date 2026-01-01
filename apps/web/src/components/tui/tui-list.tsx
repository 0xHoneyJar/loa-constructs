/**
 * TUI List Component
 * List display for skills, packs, and other items in TUI style
 * @see sprint.md T19.6: Create TUI List Component for Skills/Packs
 */

'use client';

import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardNav } from '@/hooks/use-keyboard-nav';

interface TuiListItem {
  /** Unique identifier */
  id: string;
  /** Item title */
  title: string;
  /** Meta information (version, author, etc.) */
  meta?: string;
  /** Description text */
  description?: string;
  /** Category tag */
  category?: string;
  /** Additional badge (premium, new, etc.) */
  badge?: string;
  /** Badge color */
  badgeColor?: string;
  /** Link to detail page */
  href?: string;
  /** Custom right content */
  rightContent?: ReactNode;
}

interface TuiListProps {
  /** List of items */
  items: TuiListItem[];
  /** Callback when item is selected */
  onSelect?: (item: TuiListItem) => void;
  /** Enable keyboard navigation */
  enableKeyNav?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * TUI-styled list with keyboard navigation support
 */
export function TuiList({
  items,
  onSelect,
  enableKeyNav = true,
  emptyMessage = 'No items found',
}: TuiListProps) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        if (onSelect) {
          onSelect(item);
        } else if (item.href) {
          router.push(item.href);
        }
      }
    },
    [items, onSelect, router]
  );

  const { currentIndex, setCurrentIndex } = useKeyboardNav({
    itemCount: items.length,
    enabled: enableKeyNav && items.length > 0,
    onSelect: handleSelect,
    loop: true,
  });

  // Scroll focused item into view
  useEffect(() => {
    if (listRef.current && items.length > 0) {
      const focusedItem = listRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [currentIndex, items.length]);

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--fg-dim)',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div ref={listRef} className="tui-list">
      {items.map((item, index) => (
        <TuiListItemRow
          key={item.id}
          item={item}
          index={index}
          focused={index === currentIndex}
          onClick={() => {
            setCurrentIndex(index);
            handleSelect(index);
          }}
          onMouseEnter={() => setCurrentIndex(index)}
        />
      ))}
    </div>
  );
}

interface TuiListItemRowProps {
  item: TuiListItem;
  index: number;
  focused: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function TuiListItemRow({ item, index, focused, onClick, onMouseEnter }: TuiListItemRowProps) {
  return (
    <div
      data-index={index}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        background: focused ? 'rgba(95, 175, 255, 0.1)' : 'transparent',
        transition: 'background 0.1s',
      }}
      className="tui-list-item"
    >
      {/* Header row: indicator, title, meta, badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Focus indicator */}
        <span
          style={{
            color: focused ? 'var(--accent)' : 'var(--fg-dim)',
            width: '16px',
          }}
        >
          {focused ? '→' : ' '}
        </span>

        {/* Title */}
        <span style={{ color: 'var(--fg-bright)', fontWeight: 500 }}>{item.title}</span>

        {/* Category tag */}
        {item.category && (
          <span
            style={{
              color: 'var(--cyan)',
              fontSize: '11px',
            }}
          >
            [{item.category}]
          </span>
        )}

        {/* Badge */}
        {item.badge && (
          <span
            style={{
              color: item.badgeColor || 'var(--yellow)',
              fontSize: '10px',
              padding: '1px 4px',
              border: `1px solid ${item.badgeColor || 'var(--yellow)'}`,
            }}
          >
            {item.badge}
          </span>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Meta or right content */}
        {item.rightContent || (
          <span style={{ color: 'var(--fg-dim)', fontSize: '12px' }}>{item.meta}</span>
        )}
      </div>

      {/* Description row */}
      {item.description && (
        <div
          style={{
            marginTop: '4px',
            marginLeft: '24px',
            color: 'var(--fg-dim)',
            fontSize: '12px',
            lineHeight: '1.4',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.description}
        </div>
      )}
    </div>
  );
}

export default TuiList;
