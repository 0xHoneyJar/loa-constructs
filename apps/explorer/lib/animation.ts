/**
 * Spring animation presets inspired by Emil Kowalski's design principles.
 * Use these for consistent, physically-based animations throughout the app.
 */

export const springs = {
  /** Quick, responsive - good for buttons and small interactions */
  snappy: {
    tension: 300,
    friction: 20,
  },
  /** Balanced feel - good for most transitions */
  smooth: {
    tension: 200,
    friction: 24,
  },
  /** Relaxed, subtle - good for background elements */
  gentle: {
    tension: 120,
    friction: 20,
  },
  /** Playful overshoot - good for confirmations and celebrations */
  bouncy: {
    tension: 400,
    friction: 10,
  },
} as const;

/**
 * CSS transition presets for elements that don't need spring physics.
 */
export const transitions = {
  /** 150ms ease-out - quick UI feedback */
  fast: 'all 150ms ease-out',
  /** 200ms ease-out - default transition */
  normal: 'all 200ms ease-out',
  /** 300ms ease-in-out - page transitions */
  slow: 'all 300ms ease-in-out',
} as const;

/**
 * Common animation durations in milliseconds.
 */
export const durations = {
  fast: 150,
  normal: 200,
  slow: 300,
  page: 400,
} as const;

/**
 * Checks if the user prefers reduced motion.
 * Use this to disable animations for accessibility.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns animation config or null if user prefers reduced motion.
 */
export function withReducedMotion<T>(config: T): T | null {
  return prefersReducedMotion() ? null : config;
}
