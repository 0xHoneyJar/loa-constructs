import { ConvexHttpClient } from 'convex/browser';

let _convex: ConvexHttpClient | null | undefined;

export function getConvexClient(): ConvexHttpClient | null {
  if (_convex !== undefined) return _convex;
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  _convex = url ? new ConvexHttpClient(url) : null;
  return _convex;
}
