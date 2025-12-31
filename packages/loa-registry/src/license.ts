/**
 * License Validation
 * @see sprint.md T8.4: License Validation Hook
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getClient, getCredentials } from './auth.js';
import { getCachedSkill, cacheSkill } from './cache.js';

/**
 * License validation result
 */
export interface LicenseValidationResult {
  valid: boolean;
  reason?: string;
  skill?: string;
  version?: string;
  expiresAt?: string;
  isOffline?: boolean;
  gracePeriod?: boolean;
}

/**
 * License data stored in .license.json
 */
interface LicenseFile {
  skill: string;
  version: string;
  license: {
    token: string;
    tier: string;
    expires_at?: string;
    watermark: string;
  };
  installed_at: string;
  updated_from?: string;
}

/**
 * Grace period for offline license validation (24 hours)
 */
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/**
 * Buffer time before expiry to trigger refresh (1 hour)
 */
const REFRESH_BUFFER_MS = 60 * 60 * 1000;

/**
 * Validate license for a skill before loading
 *
 * This is the main entry point for the skill:beforeLoad hook.
 *
 * @param skillDir - Path to the skill directory
 * @param registry - Registry name (default: 'default')
 * @returns Validation result
 */
export async function validateSkillLicense(
  skillDir: string,
  registry: string = 'default'
): Promise<LicenseValidationResult> {
  const licenseFile = path.join(skillDir, '.license.json');

  // Check if license file exists
  let licenseData: LicenseFile;
  try {
    const content = await fs.readFile(licenseFile, 'utf-8');
    licenseData = JSON.parse(content) as LicenseFile;
  } catch {
    // No license file - this is not a registry skill, allow loading
    return { valid: true, reason: 'Not a registry skill' };
  }

  const now = Date.now();
  const expiresAt = licenseData.license.expires_at
    ? new Date(licenseData.license.expires_at).getTime()
    : null;

  // Check if license has expiry
  if (!expiresAt) {
    // Perpetual license (lifetime access)
    return {
      valid: true,
      skill: licenseData.skill,
      version: licenseData.version,
    };
  }

  // Check if license is valid (with buffer for refresh)
  if (expiresAt > now + REFRESH_BUFFER_MS) {
    // License valid and not near expiry
    return {
      valid: true,
      skill: licenseData.skill,
      version: licenseData.version,
      expiresAt: licenseData.license.expires_at,
    };
  }

  // License expired or expiring soon - try to refresh
  const creds = getCredentials(registry);
  if (creds) {
    try {
      const client = await getClient(registry);
      const validation = await client.validateLicense(licenseData.skill);

      if (validation.valid) {
        // Update license file with refreshed expiry
        const newExpiresAt = validation.expires_at;
        licenseData.license.expires_at = newExpiresAt;
        await fs.writeFile(licenseFile, JSON.stringify(licenseData, null, 2));

        // Also refresh cache
        const cachedSkill = await getCachedSkill(licenseData.skill);
        if (cachedSkill) {
          cachedSkill.license.expires_at = newExpiresAt;
          await cacheSkill(licenseData.skill, cachedSkill);
        }

        return {
          valid: true,
          skill: licenseData.skill,
          version: licenseData.version,
          expiresAt: newExpiresAt,
        };
      }
    } catch {
      // Network error or server error - fall through to offline check
    }
  }

  // Offline mode - check grace period
  if (expiresAt + GRACE_PERIOD_MS > now) {
    // Within grace period
    return {
      valid: true,
      skill: licenseData.skill,
      version: licenseData.version,
      expiresAt: licenseData.license.expires_at,
      isOffline: true,
      gracePeriod: true,
      reason: 'Offline grace period active',
    };
  }

  // License expired and grace period passed
  return {
    valid: false,
    skill: licenseData.skill,
    version: licenseData.version,
    expiresAt: licenseData.license.expires_at,
    reason: 'License expired. Please reconnect to refresh or renew subscription.',
  };
}

/**
 * Check if a skill directory has a valid license (synchronous quick check)
 * Use validateSkillLicense for full async validation with refresh
 */
export async function hasValidLicense(skillDir: string): Promise<boolean> {
  const licenseFile = path.join(skillDir, '.license.json');

  try {
    const content = await fs.readFile(licenseFile, 'utf-8');
    const licenseData = JSON.parse(content) as LicenseFile;

    // No expiry = perpetual
    if (!licenseData.license.expires_at) {
      return true;
    }

    const expiresAt = new Date(licenseData.license.expires_at).getTime();
    const now = Date.now();

    // Valid if not expired or within grace period
    return expiresAt + GRACE_PERIOD_MS > now;
  } catch {
    // No license file = not a registry skill = allow
    return true;
  }
}

/**
 * Get license status for display
 */
export async function getLicenseStatus(skillDir: string): Promise<{
  hasLicense: boolean;
  skill?: string;
  version?: string;
  tier?: string;
  expiresAt?: string;
  isExpired?: boolean;
  inGracePeriod?: boolean;
}> {
  const licenseFile = path.join(skillDir, '.license.json');

  try {
    const content = await fs.readFile(licenseFile, 'utf-8');
    const licenseData = JSON.parse(content) as LicenseFile;

    const now = Date.now();
    const expiresAt = licenseData.license.expires_at
      ? new Date(licenseData.license.expires_at).getTime()
      : null;

    const isExpired = expiresAt ? expiresAt < now : false;
    const inGracePeriod = expiresAt ? isExpired && expiresAt + GRACE_PERIOD_MS > now : false;

    return {
      hasLicense: true,
      skill: licenseData.skill,
      version: licenseData.version,
      tier: licenseData.license.tier,
      expiresAt: licenseData.license.expires_at,
      isExpired,
      inGracePeriod,
    };
  } catch {
    return { hasLicense: false };
  }
}

/**
 * Skill loading hook for Loa CLI integration
 *
 * This function should be called by the CLI before loading any skill.
 * It returns whether the skill should be allowed to load.
 */
export async function skillBeforeLoadHook(
  skillDir: string,
  options?: { registry?: string; silent?: boolean }
): Promise<boolean> {
  const result = await validateSkillLicense(skillDir, options?.registry);

  if (!result.valid) {
    if (!options?.silent) {
      console.error(`\nSkill license invalid: ${result.reason}`);
      if (result.skill) {
        console.log(`Skill: ${result.skill}`);
        console.log('\nTo fix this:');
        console.log('1. Connect to the internet and run /skill-update ' + result.skill);
        console.log('2. Or renew your subscription at https://loaskills.dev/billing');
      }
    }
    return false;
  }

  if (result.gracePeriod && !options?.silent) {
    console.warn(`\nWarning: Skill "${result.skill}" is in offline grace period.`);
    console.warn('Connect to the internet to refresh license.');
  }

  return true;
}
