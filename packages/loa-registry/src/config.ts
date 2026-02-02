/**
 * Configuration Loader
 * @see prd.md §4.2 Client-Side Feature Gating (Opportunity 2)
 * @see sdd.md §3.2 config.ts API
 *
 * Provides configuration loading for .loa.config.yaml with support for
 * client-side pack disable via the constructs.disabled_packs array.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';

/**
 * Configuration file name
 */
const CONFIG_FILE_NAME = '.loa.config.yaml';

/**
 * Constructs section of the configuration
 */
export interface LoaConstructsConfig {
  /**
   * List of pack slugs to disable locally
   */
  disabled_packs?: string[];

  /**
   * Offline mode configuration (future)
   */
  offline?: {
    enabled?: boolean;
    cache_ttl_days?: number;
  };
}

/**
 * Full Loa configuration structure
 */
export interface LoaConfig {
  /**
   * Constructs section for pack management
   */
  constructs?: LoaConstructsConfig;

  /**
   * Any other configuration sections (pass-through)
   */
  [key: string]: unknown;
}

/**
 * Load .loa.config.yaml from the specified directory
 * @param cwd - Directory to search for config file
 * @returns Parsed configuration or null if not found/invalid
 */
export async function loadLoaConfig(cwd: string): Promise<LoaConfig | null> {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = parseYaml(content);

    // Return null if config is not an object
    if (!config || typeof config !== 'object') {
      return null;
    }

    return config as LoaConfig;
  } catch (error) {
    // File doesn't exist or YAML is invalid - graceful fallback
    return null;
  }
}

/**
 * Check if a pack is enabled (not in disabled_packs list)
 * @param packSlug - Pack slug to check
 * @param cwd - Directory to search for config file
 * @returns true if pack is enabled, false if disabled
 */
export async function isPackEnabled(packSlug: string, cwd: string): Promise<boolean> {
  const config = await loadLoaConfig(cwd);

  // No config = all packs enabled
  if (!config) {
    return true;
  }

  // No constructs section = all packs enabled
  if (!config.constructs) {
    return true;
  }

  // No disabled_packs = all packs enabled
  const disabledPacks = config.constructs.disabled_packs;
  if (!disabledPacks || !Array.isArray(disabledPacks)) {
    return true;
  }

  // Check if pack is in disabled list
  return !disabledPacks.includes(packSlug);
}

/**
 * Get list of disabled pack slugs
 * @param cwd - Directory to search for config file
 * @returns Array of disabled pack slugs
 */
export async function getDisabledPacks(cwd: string): Promise<string[]> {
  const config = await loadLoaConfig(cwd);

  // No config = no disabled packs
  if (!config) {
    return [];
  }

  // No constructs section = no disabled packs
  if (!config.constructs) {
    return [];
  }

  // Return disabled_packs array or empty array
  const disabledPacks = config.constructs.disabled_packs;
  if (!disabledPacks || !Array.isArray(disabledPacks)) {
    return [];
  }

  return disabledPacks;
}

/**
 * Get the path to the config file
 * @param cwd - Directory to search for config file
 * @returns Full path to the config file
 */
export function getConfigPath(cwd: string): string {
  return path.join(cwd, CONFIG_FILE_NAME);
}

/**
 * Check if a config file exists
 * @param cwd - Directory to search for config file
 * @returns true if config file exists
 */
export async function hasConfig(cwd: string): Promise<boolean> {
  const configPath = getConfigPath(cwd);

  try {
    await fs.access(configPath);
    return true;
  } catch {
    return false;
  }
}
