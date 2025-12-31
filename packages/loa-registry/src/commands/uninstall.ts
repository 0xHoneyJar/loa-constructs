/**
 * Uninstall Command
 * @see sprint.md T8.3: Uninstall Command
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Command } from '../types.js';
import { getClient, getCredentials } from '../auth.js';
import { clearSkillCache } from '../cache.js';

/**
 * Uninstall command implementation
 * Removes an installed skill
 */
export const uninstallCommand: Command = {
  name: 'skill-uninstall',
  description: 'Uninstall a skill',
  args: {
    skill: {
      type: 'string',
      required: true,
      description: 'Skill slug or name to uninstall',
    },
    registry: {
      type: 'string',
      description: 'Registry to notify (default: default)',
    },
  },

  async execute(context) {
    const slug = context.args.skill as string;
    const registry = (context.args.registry as string) || 'default';

    if (!slug) {
      console.error('Usage: /skill-uninstall <skill-slug>');
      console.log('\nExample: /skill-uninstall terraform-assistant');
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
      console.log('\nUse /skill-list to see installed skills.');
      return;
    }

    // Read license to get full slug
    let fullSlug = slug;
    try {
      const licenseFile = path.join(skillDir, '.license.json');
      const licenseData = await fs.readFile(licenseFile, 'utf-8');
      const license = JSON.parse(licenseData) as { skill: string };
      fullSlug = license.skill;
    } catch {
      // Use provided slug if no license file
    }

    console.log(`Uninstalling ${skillName}...`);

    // Remove skill directory
    try {
      await fs.rm(skillDir, { recursive: true, force: true });
      console.log('✓ Removed skill files');
    } catch (error) {
      console.error('Failed to remove skill directory:', error);
      throw error;
    }

    // Clear from cache
    try {
      await clearSkillCache(fullSlug);
      console.log('✓ Cleared cache');
    } catch {
      // Non-fatal
    }

    // Record uninstallation with registry
    const creds = getCredentials(registry);
    if (creds) {
      try {
        const client = await getClient(registry);
        await client.recordUninstall(fullSlug);
        console.log('✓ Updated registry');
      } catch {
        // Non-fatal - skill is uninstalled locally
      }
    }

    console.log(`\n✓ Uninstalled ${skillName}`);
    console.log('\nTo reinstall, run: /skill-install ' + fullSlug);
  },
};
