'use client';

/**
 * R3F primitive wrappers using createElement to avoid JSX.IntrinsicElements
 * type errors with React 19 and @react-three/fiber peer dependency issues.
 */

import { createElement, type ReactNode } from 'react';

interface GroupProps {
  children?: ReactNode;
  position?: [number, number, number];
}

export function ThreeGroup({ children, position }: GroupProps) {
  return createElement('group', { position }, children);
}
