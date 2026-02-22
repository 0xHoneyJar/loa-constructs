/**
 * Extract and sanitize prose from SKILL.md content.
 * Strips YAML frontmatter, truncates at sentence boundary, removes HTML.
 * @see sdd.md §4.3.2
 */

const MAX_PROSE_LENGTH = 2000;

/** Strip YAML frontmatter delimited by --- */
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length) : content;
}

/** Strip all HTML tags (defense-in-depth sanitization) */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/** Truncate at sentence boundary within maxLen chars */
function truncateAtSentence(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;

  const truncated = text.slice(0, maxLen);
  // Find last sentence-ending punctuation
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('?\n'),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('!\n'),
  );

  if (lastSentenceEnd > maxLen * 0.3) {
    // Found a sentence boundary in the latter 70% — truncate there
    return truncated.slice(0, lastSentenceEnd + 1).trimEnd();
  }

  // No good sentence boundary — truncate at last space
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.5) {
    return truncated.slice(0, lastSpace).trimEnd() + '…';
  }

  return truncated.trimEnd() + '…';
}

/**
 * Extract prose from SKILL.md file content.
 * @param base64Content - Base64-encoded file content from git sync
 * @returns Sanitized prose string, or null if empty/invalid
 */
export function extractSkillProse(base64Content: string): string | null {
  try {
    const raw = Buffer.from(base64Content, 'base64').toString('utf-8');
    const withoutFrontmatter = stripFrontmatter(raw).trim();

    if (!withoutFrontmatter) return null;

    const sanitized = stripHtml(withoutFrontmatter).trim();
    if (!sanitized) return null;

    const prose = truncateAtSentence(sanitized, MAX_PROSE_LENGTH);
    return prose || null;
  } catch {
    return null;
  }
}

/**
 * Find the primary SKILL.md from a list of synced files.
 * Prefers root-level SKILL.md over nested ones.
 */
export function findSkillMd(files: Array<{ path: string; content: string }>): { path: string; content: string } | null {
  // Prefer root-level SKILL.md
  const root = files.find((f) => f.path === 'SKILL.md' || f.path === 'skill.md');
  if (root) return root;

  // Fall back to any SKILL.md (shallowest first)
  const candidates = files
    .filter((f) => /(?:^|\/)skill\.md$/i.test(f.path))
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length);

  return candidates[0] ?? null;
}
