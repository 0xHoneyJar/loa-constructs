/**
 * Pack Marker Utilities
 * @see prd.md §4.1 Magic Markers (Opportunity 1)
 * @see sdd.md §3.1 pack-marker.ts API
 *
 * Provides ownership markers for installed pack files using Projen-style patterns.
 * Markers enable clear distinction between pack-managed and user-owned files.
 */

import { createHash } from 'crypto';

/**
 * Information extracted from a pack marker
 */
export interface PackMarkerInfo {
  packManaged: boolean;
  pack: string;
  version: string;
  hash: string;
}

/**
 * File extensions that support markers
 */
const MARKABLE_EXTENSIONS = ['.md', '.yaml', '.yml'];

/**
 * Warning line text
 */
const WARNING_TEXT = 'DO NOT EDIT - Installed by Loa Constructs Registry';

/**
 * Marker patterns for detection
 */
const MARKDOWN_MARKER_REGEX = /^<!--\s*@pack-managed:\s*true\s*\|\s*pack:\s*([^\s|]+)\s*\|\s*version:\s*([^\s|]+)\s*\|\s*hash:\s*([a-f0-9]+)\s*-->\s*\n<!--\s*DO NOT EDIT[^>]*-->\s*\n/;
const YAML_MARKER_REGEX = /^#\s*@pack-managed:\s*true\s*\|\s*pack:\s*([^\s|]+)\s*\|\s*version:\s*([^\s|]+)\s*\|\s*hash:\s*([a-f0-9]+)\s*\n#\s*DO NOT EDIT[^\n]*\n/;

/**
 * Check if a file type supports markers
 * @param filePath - Path to the file
 * @returns true if the file extension is markable
 */
export function shouldAddMarker(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  return MARKABLE_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
}

/**
 * Compute SHA-256 hash of content (first 16 characters)
 * @param content - Content to hash
 * @returns 16-character hexadecimal hash prefix
 */
export function computeContentHash(content: string): string {
  return createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Determine if content is markdown based on file path
 * @param filePath - Path to the file
 * @returns true if file is markdown
 */
function isMarkdown(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.md');
}

/**
 * Add pack marker to content
 * @param content - Original file content
 * @param packSlug - Pack identifier slug
 * @param version - Pack version
 * @param filePath - Path to the file (determines marker format)
 * @returns Content with marker prepended
 */
export function addPackMarker(
  content: string,
  packSlug: string,
  version: string,
  filePath: string
): string {
  // Compute hash of original content (before marker)
  const hash = computeContentHash(content);

  if (isMarkdown(filePath)) {
    // Markdown format: HTML comments
    const marker = `<!-- @pack-managed: true | pack: ${packSlug} | version: ${version} | hash: ${hash} -->`;
    const warning = `<!-- ${WARNING_TEXT} -->`;
    return `${marker}\n${warning}\n\n${content}`;
  } else {
    // YAML format: hash comments
    const marker = `# @pack-managed: true | pack: ${packSlug} | version: ${version} | hash: ${hash}`;
    const warning = `# ${WARNING_TEXT}`;
    return `${marker}\n${warning}\n\n${content}`;
  }
}

/**
 * Check if content has a pack marker
 * @param content - Content to check
 * @returns true if content has a valid pack marker
 */
export function hasPackMarker(content: string): boolean {
  return MARKDOWN_MARKER_REGEX.test(content) || YAML_MARKER_REGEX.test(content);
}

/**
 * Extract pack marker information from content
 * @param content - Content to parse
 * @returns PackMarkerInfo if marker exists, null otherwise
 */
export function extractPackMarker(content: string): PackMarkerInfo | null {
  // Try markdown format first
  const mdMatch = content.match(MARKDOWN_MARKER_REGEX);
  if (mdMatch) {
    return {
      packManaged: true,
      pack: mdMatch[1],
      version: mdMatch[2],
      hash: mdMatch[3],
    };
  }

  // Try YAML format
  const yamlMatch = content.match(YAML_MARKER_REGEX);
  if (yamlMatch) {
    return {
      packManaged: true,
      pack: yamlMatch[1],
      version: yamlMatch[2],
      hash: yamlMatch[3],
    };
  }

  return null;
}

/**
 * Remove pack marker from content
 * @param content - Content with marker
 * @returns Content with marker removed
 */
export function removePackMarker(content: string): string {
  // Remove markdown marker (including the blank line after)
  let result = content.replace(MARKDOWN_MARKER_REGEX, '');

  // Remove YAML marker (including the blank line after)
  result = result.replace(YAML_MARKER_REGEX, '');

  // Remove any leading blank line that may remain
  return result.replace(/^\n/, '');
}

/**
 * Verify content integrity against marker hash
 * @param content - Content with marker
 * @returns true if content hash matches marker hash, false if modified or no marker
 */
export function verifyPackMarkerIntegrity(content: string): boolean {
  const markerInfo = extractPackMarker(content);
  if (!markerInfo) {
    return false;
  }

  // Extract original content (after marker)
  const originalContent = removePackMarker(content);
  const computedHash = computeContentHash(originalContent);

  return computedHash === markerInfo.hash;
}
