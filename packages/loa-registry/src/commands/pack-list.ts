/**
 * Pack List Command
 * @see sprint-v2.md T15.2: CLI Pack List Command
 * @see sprint.md T23.4: Add disabled indicator to pack-list.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Command, InstalledPack } from '../types.js';
import type { PackManifest, PackLicense } from '@loa-constructs/shared';
import { getDisabledPacks } from '../config.js';

/**
 * Pack list command implementation
 * Lists all installed packs (works offline)
 */
export const packListCommand: Command = {
  name: 'pack-list',
  description: 'List installed packs',
  args: {
    verbose: {
      type: 'boolean',
      description: 'Show detailed information',
    },
  },

  async execute(context) {
    const verbose = context.args.verbose as boolean;
    const packsDir = path.join(context.cwd, '.claude', 'packs');

    try {
      // Check if packs directory exists
      try {
        await fs.access(packsDir);
      } catch {
        console.log('No packs installed.\n');
        console.log('Use /pack-install <slug> to install a pack.');
        console.log('Use /pack-search to find available packs.');
        return;
      }

      // Read pack directories
      const entries = await fs.readdir(packsDir, { withFileTypes: true });
      const packDirs = entries.filter(e => e.isDirectory());

      if (packDirs.length === 0) {
        console.log('No packs installed.\n');
        console.log('Use /pack-install <slug> to install a pack.');
        console.log('Use /pack-search to find available packs.');
        return;
      }

      // Load installed packs
      const installedPacks: InstalledPack[] = [];

      for (const dir of packDirs) {
        const packDir = path.join(packsDir, dir.name);

        try {
          // Read manifest
          const manifestPath = path.join(packDir, 'manifest.json');
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest: PackManifest = JSON.parse(manifestContent);

          // Read license
          const licensePath = path.join(packDir, '.license.json');
          let license: PackLicense | null = null;
          let licenseValid = false;
          let expiresAt: string | undefined;

          try {
            const licenseContent = await fs.readFile(licensePath, 'utf-8');
            license = JSON.parse(licenseContent);

            if (license) {
              expiresAt = license.expires_at;
              licenseValid = new Date(license.expires_at) > new Date();
            }
          } catch {
            // No license file or invalid
          }

          installedPacks.push({
            name: manifest.name,
            slug: manifest.slug,
            version: manifest.version,
            skills: manifest.skills?.map(s => s.slug) || [],
            commands: manifest.commands?.map(c => c.name) || [],
            licenseValid,
            expiresAt,
            installedAt: license?.installed_at || 'Unknown',
          });
        } catch (error) {
          // Skip invalid pack directories
          console.warn(`Warning: Could not read pack ${dir.name}: ${error}`);
        }
      }

      if (installedPacks.length === 0) {
        console.log('No valid packs found.\n');
        console.log('Use /pack-install <slug> to install a pack.');
        return;
      }

      // Get disabled packs from config
      // @see prd.md §4.2 Client-Side Feature Gating
      const disabledPacks = await getDisabledPacks(context.cwd);
      const disabledSet = new Set(disabledPacks);

      // Display installed packs
      console.log('Installed Packs:\n');

      for (const pack of installedPacks) {
        const contentParts: string[] = [];
        if (pack.skills.length > 0) {
          contentParts.push(`${pack.skills.length} skill${pack.skills.length > 1 ? 's' : ''}`);
        }
        if (pack.commands.length > 0) {
          contentParts.push(`${pack.commands.length} command${pack.commands.length > 1 ? 's' : ''}`);
        }
        const contentStr = contentParts.length > 0 ? `(${contentParts.join(', ')})` : '';

        // Show [disabled] indicator if pack is in disabled_packs
        const isDisabled = disabledSet.has(pack.slug);
        const disabledIndicator = isDisabled ? ' [disabled]' : '';

        console.log(`  ${pack.name}${disabledIndicator}`);
        console.log(`    Version: ${pack.version} ${contentStr}`);

        // License status
        if (pack.licenseValid && pack.expiresAt) {
          const expiresDate = new Date(pack.expiresAt);
          const now = new Date();
          const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysLeft <= 7) {
            console.log(`    License: Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${expiresDate.toLocaleDateString()})`);
          } else {
            console.log(`    License: Valid until ${expiresDate.toLocaleDateString()}`);
          }
        } else if (!pack.licenseValid) {
          console.log(`    License: EXPIRED - Run /pack-update to renew`);
        }

        // Installed date
        if (pack.installedAt && pack.installedAt !== 'Unknown') {
          const installedDate = new Date(pack.installedAt);
          console.log(`    Installed: ${installedDate.toLocaleDateString()}`);
        }

        // Verbose output
        if (verbose) {
          if (pack.skills.length > 0) {
            console.log(`    Skills: ${pack.skills.join(', ')}`);
          }
          if (pack.commands.length > 0) {
            console.log(`    Commands: /${pack.commands.join(', /')}`);
          }
        }

        console.log('');
      }

      // Summary
      const totalSkills = installedPacks.reduce((sum, p) => sum + p.skills.length, 0);
      const totalCommands = installedPacks.reduce((sum, p) => sum + p.commands.length, 0);
      const expiredCount = installedPacks.filter(p => !p.licenseValid).length;
      const disabledCount = installedPacks.filter(p => disabledSet.has(p.slug)).length;

      console.log(`Total: ${installedPacks.length} pack${installedPacks.length !== 1 ? 's' : ''}, ${totalSkills} skill${totalSkills !== 1 ? 's' : ''}, ${totalCommands} command${totalCommands !== 1 ? 's' : ''}`);

      if (expiredCount > 0) {
        console.log(`\n⚠ ${expiredCount} pack${expiredCount !== 1 ? 's have' : ' has'} expired license${expiredCount !== 1 ? 's' : ''}`);
      }

      if (disabledCount > 0) {
        console.log(`\n⚠ ${disabledCount} pack${disabledCount !== 1 ? 's' : ''} disabled via .loa.config.yaml`);
      }

    } catch (error) {
      console.error('Failed to list packs:', error);
      throw error;
    }
  },
};
