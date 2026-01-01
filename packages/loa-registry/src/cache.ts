/**
 * Skill Cache Management
 * @see sprint.md T7.3: Credential Storage (includes cache)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import type { SkillDownload } from '@loa-constructs/shared';
import type { CachedSkill, InstalledSkill } from './types.js';

/**
 * Cache directory path
 */
const CACHE_DIR = process.env.LOA_SKILLS_CACHE_DIR || path.join(homedir(), '.loa-registry', 'cache', 'skills');

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

/**
 * Get cache file path for a skill slug
 */
function getCachePath(slug: string): string {
  // Replace slashes with underscores for filesystem safety
  const safeSlug = slug.replace(/\//g, '_');
  return path.join(CACHE_DIR, `${safeSlug}.json`);
}

/**
 * Cache a downloaded skill for offline use
 */
export async function cacheSkill(slug: string, download: SkillDownload): Promise<void> {
  await ensureCacheDir();

  const cached: CachedSkill = {
    slug,
    version: download.skill.version,
    download,
    cachedAt: new Date().toISOString(),
  };

  const cachePath = getCachePath(slug);
  await fs.writeFile(cachePath, JSON.stringify(cached, null, 2));
}

/**
 * Get cached skill if available and license not expired
 */
export async function getCachedSkill(slug: string): Promise<SkillDownload | null> {
  const cachePath = getCachePath(slug);

  try {
    const data = await fs.readFile(cachePath, 'utf-8');
    const cached: CachedSkill = JSON.parse(data);

    // Check if license is still valid
    if (cached.download.license.expires_at) {
      const expiresAt = new Date(cached.download.license.expires_at);
      if (expiresAt < new Date()) {
        // Cache expired, but keep for offline grace period
        const gracePeriod = 24 * 60 * 60 * 1000; // 24 hours
        if (expiresAt.getTime() + gracePeriod < Date.now()) {
          return null;
        }
      }
    }

    return cached.download;
  } catch {
    return null;
  }
}

/**
 * Check if a skill is installed in the current project
 */
export async function isInstalled(slug: string, cwd: string = process.cwd()): Promise<boolean> {
  const skillName = slug.split('/').pop() || slug;
  const licensePath = path.join(cwd, '.claude', 'skills', skillName, '.license.json');

  try {
    await fs.access(licensePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all installed skills from the current project
 */
export async function getInstalledSkills(cwd: string = process.cwd()): Promise<InstalledSkill[]> {
  const skillsDir = path.join(cwd, '.claude', 'skills');
  const installed: InstalledSkill[] = [];

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const licenseFile = path.join(skillsDir, entry.name, '.license.json');

      try {
        const data = await fs.readFile(licenseFile, 'utf-8');
        const license = JSON.parse(data) as {
          skill: string;
          version: string;
          license: {
            expires_at?: string;
          };
        };

        const expiresAt = license.license.expires_at
          ? new Date(license.license.expires_at)
          : null;
        const licenseValid = !expiresAt || expiresAt > new Date();

        installed.push({
          name: entry.name,
          slug: license.skill,
          version: license.version,
          licenseValid,
          expiresAt: license.license.expires_at,
        });
      } catch {
        // No license file - skip (not a registry skill)
      }
    }
  } catch {
    // Skills directory doesn't exist
  }

  return installed;
}

/**
 * Get cached skill metadata without full content
 */
export async function getCachedSkillInfo(slug: string): Promise<{ version: string; cachedAt: string } | null> {
  const cachePath = getCachePath(slug);

  try {
    const data = await fs.readFile(cachePath, 'utf-8');
    const cached: CachedSkill = JSON.parse(data);
    return {
      version: cached.version,
      cachedAt: cached.cachedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Clear all cached skills
 */
export async function clearCache(): Promise<void> {
  try {
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
    await ensureCacheDir();
  } catch {
    // Ignore errors
  }
}

/**
 * Clear cache for a specific skill
 */
export async function clearSkillCache(slug: string): Promise<void> {
  const cachePath = getCachePath(slug);
  try {
    await fs.unlink(cachePath);
  } catch {
    // Ignore errors
  }
}

/**
 * Get cache directory size (approximate)
 */
export async function getCacheSize(): Promise<number> {
  let totalSize = 0;

  try {
    const files = await fs.readdir(CACHE_DIR);
    for (const file of files) {
      const stats = await fs.stat(path.join(CACHE_DIR, file));
      totalSize += stats.size;
    }
  } catch {
    // Ignore errors
  }

  return totalSize;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
