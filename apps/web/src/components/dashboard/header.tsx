/**
 * Dashboard Header Component (TUI Style)
 * @see sprint.md T19.4: Redesign Dashboard Header
 *
 * Note: In TUI design, the header is minimal. Section titles are shown
 * in the TuiBox title. User actions moved to sidebar. Mobile menu
 * handled by TuiLayout.
 */

'use client';

interface HeaderProps {
  title?: string;
}

/**
 * Simplified TUI header - most functionality moved to TuiLayout
 * This component is now deprecated for new layouts but kept for compatibility
 */
export function Header({ title }: HeaderProps) {
  // In TUI design, the header is integrated into the layout
  // Title appears in TuiBox, mobile menu in TuiLayout
  // This component can be removed from layouts using TuiLayout
  return null;
}

export default Header;
