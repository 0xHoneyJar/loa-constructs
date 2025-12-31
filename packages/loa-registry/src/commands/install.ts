/**
 * Install Command
 * @see sprint.md T8.1: Install Command
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Command } from '../types.js';
import { getClient, getCredentials, canAccessTier } from '../auth.js';
import { RegistryError } from '../client.js';
import { cacheSkill } from '../cache.js';

/**
 * Install command implementation
 * Downloads and installs a skill from the registry
 */
export const installCommand: Command = {
  name: 'skill-install',
  description: 'Install a skill from the registry',
  args: {
    skill: {
      type: 'string',
      required: true,
      description: 'Skill slug to install',
    },
    version: {
      type: 'string',
      description: 'Specific version to install (default: latest)',
    },
    registry: {
      type: 'string',
      description: 'Registry to install from (default: default)',
    },
  },

  async execute(context) {
    const slug = context.args.skill as string;
    const version = context.args.version as string | undefined;
    const registry = (context.args.registry as string) || 'default';

    if (!slug) {
      console.error('Usage: /skill-install <skill-slug> [--version <version>]');
      console.log('\nExample: /skill-install terraform-assistant');
      console.log('         /skill-install terraform-assistant --version 1.2.0');
      return;
    }

    const creds = getCredentials(registry);
    if (!creds) {
      console.error('Not logged in. Run /skill-login first.');
      return;
    }

    try {
      const client = await getClient(registry);

      // 1. Get skill info to check tier requirement
      console.log(`Fetching skill info for ${slug}...`);
      const skill = await client.getSkill(slug);

      // 2. Check subscription tier
      const userTier = creds.tier;
      if (!canAccessTier(userTier, skill.tier_required)) {
        console.error(`\nThis skill requires a ${skill.tier_required} subscription.`);
        console.log(`Your current tier: ${userTier}`);
        console.log('\nUpgrade at: https://loaskills.dev/billing');
        return;
      }

      // 3. Download skill files
      const targetVersion = version || skill.latest_version;
      console.log(`Downloading ${skill.name} v${targetVersion}...`);

      const download = await client.downloadSkill(slug, targetVersion);

      // 4. Determine install directory
      const skillName = slug.split('/').pop() || slug;
      const installDir = path.join(context.cwd, '.claude', 'skills', skillName);

      // 5. Check if already installed
      try {
        await fs.access(installDir);
        console.log(`\nSkill "${skillName}" is already installed.`);
        console.log('Use /skill-update to update, or /skill-uninstall first.');
        return;
      } catch {
        // Not installed, continue
      }

      // 6. Create directory structure
      console.log(`Installing to ${installDir}...`);
      await fs.mkdir(installDir, { recursive: true });

      // 7. Write skill files
      for (const file of download.skill.files) {
        const filePath = path.join(installDir, file.path);
        const fileDir = path.dirname(filePath);

        // Ensure parent directory exists
        await fs.mkdir(fileDir, { recursive: true });

        // Write file content
        await fs.writeFile(filePath, file.content, 'utf-8');
      }

      // 8. Write license file
      const licenseData = {
        skill: slug,
        version: download.skill.version,
        license: download.license,
        installed_at: new Date().toISOString(),
      };
      await fs.writeFile(
        path.join(installDir, '.license.json'),
        JSON.stringify(licenseData, null, 2)
      );

      // 9. Cache for offline use
      await cacheSkill(slug, download);

      // 10. Record installation with registry
      try {
        await client.recordInstall(slug, download.skill.version);
      } catch (error) {
        // Non-fatal - skill is installed locally even if tracking fails
        console.warn('Warning: Failed to record installation with registry');
      }

      // 11. Success message
      console.log(`\n✓ Installed ${skill.name} v${download.skill.version}`);
      console.log(`\nLocation: ${installDir}`);

      // Show license info
      if (download.license.expires_at) {
        const expiresAt = new Date(download.license.expires_at);
        console.log(`License expires: ${expiresAt.toLocaleDateString()}`);
      }

      // Usage hint
      console.log('\nTo use this skill, it will be automatically loaded by Loa.');
      console.log('Run /skill-info ' + slug + ' for documentation.');

    } catch (error) {
      if (error instanceof RegistryError) {
        if (error.isNotFound()) {
          console.error(`Skill "${slug}" not found.`);
          console.log('\nUse /skill-search to find available skills.');
          return;
        }
        if (error.isTierRequired()) {
          console.error(`\nThis skill requires a higher subscription tier.`);
          console.log('Upgrade at: https://loaskills.dev/billing');
          return;
        }
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Installation failed:', error);
      }
      throw error;
    }
  },
};
