/**
 * Resolve a construct's short description from the three-tier fallback chain:
 * 1. short_description field (handcrafted tagline)
 * 2. First sentence of description, capped at 80 chars
 * 3. 'No description'
 */
export function resolveShortDescription(
  shortDescription: string | null | undefined,
  description: string | null | undefined,
): string {
  return (
    shortDescription
    || (description ? description.split('.')[0].slice(0, 80) : null)
    || 'No description'
  );
}
