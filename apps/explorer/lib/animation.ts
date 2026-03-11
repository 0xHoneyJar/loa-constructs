/**
 * Checks if the user prefers reduced motion.
 * Use this to disable animations for accessibility.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
