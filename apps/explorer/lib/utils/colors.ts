import type { Domain } from '@/lib/types/graph';

export const DOMAIN_COLORS: Record<Domain, string> = {
  gtm: '#FF44FF',
  dev: '#44FF88',
  security: '#FF8844',
  analytics: '#FFDD44',
  docs: '#44DDFF',
  ops: '#4488FF',
};

export const DOMAIN_LABELS: Record<Domain, string> = {
  gtm: 'GTM',
  dev: 'DEV',
  security: 'SEC',
  analytics: 'DATA',
  docs: 'DOCS',
  ops: 'OPS',
};

export function getDomainColor(domain: Domain): string {
  return DOMAIN_COLORS[domain] || DOMAIN_COLORS.dev;
}

export function getDomainLabel(domain: Domain): string {
  return DOMAIN_LABELS[domain] || domain.toUpperCase();
}
