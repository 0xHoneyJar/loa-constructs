'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  /** Animation variant */
  animation?: 'fade' | 'stagger' | 'draw';
  /** Delay between staggered children in ms (multiples of 83ms quantum) */
  staggerDelay?: number;
  /** IntersectionObserver threshold (0-1) */
  threshold?: number;
  /** CSS class name override */
  className?: string;
  /** Inline styles (passed through to wrapper div) */
  style?: CSSProperties;
}

export function ScrollReveal({
  children,
  animation = 'fade',
  staggerDelay = 83,
  threshold = 0.15,
  className,
  style,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion — show everything immediately
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      el.setAttribute('data-visible', 'true');
      return;
    }

    // Set stagger indices on direct children for stagger and draw variants
    if (animation === 'stagger' || animation === 'draw') {
      const children = el.querySelectorAll(':scope > *');
      children.forEach((child, i) => {
        (child as HTMLElement).style.setProperty(
          '--stagger-idx',
          String(i)
        );
        (child as HTMLElement).style.setProperty(
          '--stagger-delay',
          `${staggerDelay}ms`
        );
      });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute('data-visible', 'true');
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [animation, staggerDelay, threshold]);

  return (
    <div
      ref={ref}
      className={`scroll-reveal scroll-reveal--${animation}${className ? ` ${className}` : ''}`}
      data-visible="false"
      style={style}
    >
      {children}
    </div>
  );
}
