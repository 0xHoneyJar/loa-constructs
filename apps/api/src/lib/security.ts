/**
 * Security Utilities
 * @see sprint-v2.md T14.6: Path Validation Consistency (L4)
 */

import { logger } from './logger.js';

// --- Types ---

export interface PathValidationResult {
  valid: boolean;
  sanitized?: string;
  error?: string;
}

// --- Path Validation ---

/**
 * Validate and sanitize file paths
 * Prevents path traversal and injection attacks
 * @see sdd-v2.md §4.4 L4: Consistent Path Validation
 */
export function validatePath(path: string): PathValidationResult {
  // Check for null bytes (can bypass filename checks)
  if (path.includes('\0')) {
    logger.warn({ path: path.substring(0, 100) }, 'Path validation failed: null bytes detected');
    return { valid: false, error: 'Path contains null bytes' };
  }

  // Check for path traversal attempts
  if (path.includes('..')) {
    logger.warn({ path: path.substring(0, 100) }, 'Path validation failed: path traversal detected');
    return { valid: false, error: 'Path traversal not allowed' };
  }

  // Check for absolute paths (on any platform)
  if (path.startsWith('/') || path.startsWith('\\') || /^[A-Za-z]:/.test(path)) {
    logger.warn({ path: path.substring(0, 100) }, 'Path validation failed: absolute path detected');
    return { valid: false, error: 'Absolute paths not allowed' };
  }

  // Only allow safe characters: alphanumeric, underscores, hyphens, dots, forward slashes
  const validPathRegex = /^[a-zA-Z0-9/_.-]+$/;
  if (!validPathRegex.test(path)) {
    logger.warn({ path: path.substring(0, 100) }, 'Path validation failed: invalid characters');
    return { valid: false, error: 'Path contains invalid characters' };
  }

  // Check for double slashes
  if (path.includes('//')) {
    logger.warn({ path: path.substring(0, 100) }, 'Path validation failed: double slashes detected');
    return { valid: false, error: 'Path contains double slashes' };
  }

  // Check for hidden files (starting with .)
  const segments = path.split('/');
  for (const segment of segments) {
    if (segment.startsWith('.') && segment !== '.' && !segment.startsWith('.claude')) {
      // Allow .claude for skill files, but block other hidden files
      if (!path.includes('.claude/')) {
        logger.warn({ path: path.substring(0, 100) }, 'Path validation failed: hidden file detected');
        return { valid: false, error: 'Hidden files not allowed' };
      }
    }
  }

  // Sanitize: normalize slashes
  const sanitized = path.replace(/\/+/g, '/').replace(/^\//, '');

  return { valid: true, sanitized };
}

/**
 * Generate safe storage key for pack files
 * @param packSlug - Pack slug (already validated)
 * @param version - Version string (already validated)
 * @param filePath - File path to validate
 */
export function generatePackStorageKey(
  packSlug: string,
  version: string,
  filePath: string
): { valid: boolean; key?: string; error?: string } {
  const pathResult = validatePath(filePath);
  if (!pathResult.valid) {
    return { valid: false, error: pathResult.error };
  }

  const key = `packs/${packSlug}/${version}/${pathResult.sanitized}`;
  return { valid: true, key };
}

/**
 * Validate pack slug format
 */
export function validatePackSlug(slug: string): boolean {
  // Must be lowercase alphanumeric with hyphens, 1-100 chars
  // Must start and end with alphanumeric
  const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
  if (slug.length < 2) {
    return /^[a-z0-9]$/.test(slug);
  }
  return slug.length <= 100 && slugRegex.test(slug);
}

/**
 * Validate semver format
 */
export function validateSemver(version: string): boolean {
  const semverRegex = /^\d+\.\d+\.\d+$/;
  return semverRegex.test(version);
}
