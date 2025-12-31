/**
 * Update Command
 * @see sprint.md T8.2: Update Command
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Command } from '../types.js';
import { getClient, getCredentials, canAccessTier } from '../auth.js';
import { RegistryError } from '../client.js';
import { cacheSkill } from '../cache.js';

/**
 * Update command implementation
 * Updates an installed skill to the latest version
 */
export const updateCommand: Command = {
  name: 'skill-update',
  description: 'Update an installed skill to the latest version',
  args: {
    skill: {
      type: 'string',
      required: true,
      description: 'Skill slug or name to update',
    },
    version: {
      type: 'string',
      description: 'Specific version to update to (default: latest)',
    },
    registry: {
      type: 'string',
      description: 'Registry to use (default: default)',
    },
  },

  async execute(context) {
    const slug = context.args.skill as string;
    const targetVersion = context.args.version as string | undefined;
    const registry = (context.args.registry as string) || 'default';

    if (!slug) {
      console.error('Usage: /skill-update <skill-slug> [--version <version>]');
      console.log('\nExample: /skill-update terraform-assistant');
      return;
    }

    const creds = getCredentials(registry);
    if (!creds) {
      console.error('Not logged in. Run /skill-login first.');
      return;
    }

    // Determine skill directory
    const skillName = slug.split('/').pop() || slug;
    const skillDir = path.join(context.cwd, '.claude', 'skills', skillName);

    // Check if installed
    try {
      await fs.access(skillDir);
    } catch {
      console.error(`Skill "${skillName}" is not installed.`);
      console.log('\nUse /skill-install to install it first.');
      return;
    }

    // Read current license to get full slug and version
    let fullSlug = slug;
    let currentVersion = 'unknown';
    try {
      const licenseFile = path.join(skillDir, '.license.json');
      const licenseData = await fs.readFile(licenseFile, 'utf-8');
      const license = JSON.parse(licenseData) as { skill: string; version: string };
      fullSlug = license.skill;
      currentVersion = license.version;
    } catch {
      console.warn('Warning: Could not read current version');
    }

    try {
      const client = await getClient(registry);

      // Get skill info
      console.log(`Checking for updates to ${skillName}...`);
      const skill = await client.getSkill(fullSlug);

      // Check subscription tier
      const userTier = creds.tier;
      if (!canAccessTier(userTier, skill.tier_required)) {
        console.error(`\nThis skill requires a ${skill.tier_required} subscription.`);
        console.log(`Your current tier: ${userTier}`);
        console.log('\nUpgrade at: https://loaskills.dev/billing');
        return;
      }

      // Determine version to update to
      const newVersion = targetVersion || skill.latest_version;

      // Check if already on target version
      if (currentVersion === newVersion) {
        console.log(`\n✓ Already on version ${currentVersion}`);
        console.log('No update needed.');
        return;
      }

      console.log(`Current version: ${currentVersion}`);
      console.log(`New version: ${newVersion}`);
      console.log(`\nDownloading ${skill.name} v${newVersion}...`);

      // Download new version
      const download = await client.downloadSkill(fullSlug, newVersion);

      // Backup user-modified files (check for common patterns)
      const userModifiedFiles: string[] = [];
      for (const file of download.skill.files) {
        const filePath = path.join(skillDir, file.path);
        try {
          const existingContent = await fs.readFile(filePath, 'utf-8');
          // Simple check: if first line contains "USER MODIFIED" or similar, warn
          if (existingContent.includes('USER MODIFIED') || existingContent.includes('# Custom')) {
            userModifiedFiles.push(file.path);
          }
        } catch {
          // File doesn't exist, no conflict
        }
      }

      if (userModifiedFiles.length > 0) {
        console.log('\nWarning: The following files appear to be user-modified:');
        for (const file of userModifiedFiles) {
          console.log(`  - ${file}`);
        }
        console.log('These will be overwritten. Backup if needed.');
      }

      // Update files
      console.log('Installing update...');
      for (const file of download.skill.files) {
        const filePath = path.join(skillDir, file.path);
        const fileDir = path.dirname(filePath);

        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf-8');
      }

      // Update license file
      const licenseData = {
        skill: fullSlug,
        version: download.skill.version,
        license: download.license,
        installed_at: new Date().toISOString(),
        updated_from: currentVersion,
      };
      await fs.writeFile(
        path.join(skillDir, '.license.json'),
        JSON.stringify(licenseData, null, 2)
      );

      // Update cache
      await cacheSkill(fullSlug, download);

      // Record update with registry
      try {
        await client.recordInstall(fullSlug, download.skill.version);
      } catch {
        // Non-fatal
      }

      console.log(`\n✓ Updated ${skill.name} to v${download.skill.version}`);

      // Show license info
      if (download.license.expires_at) {
        const expiresAt = new Date(download.license.expires_at);
        console.log(`License expires: ${expiresAt.toLocaleDateString()}`);
      }

    } catch (error) {
      if (error instanceof RegistryError) {
        if (error.isNotFound()) {
          console.error(`Skill "${fullSlug}" not found in registry.`);
          return;
        }
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Update failed:', error);
      }
      throw error;
    }
  },
};
