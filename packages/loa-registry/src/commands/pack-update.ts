/**
 * Pack Update Command
 * @see sprint-v2.md T15.3: CLI Pack Update Command
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Command } from '../types.js';
import type { PackManifest, PackLicense } from '@loa-registry/shared';
import { getClient, getCredentials, canAccessTier } from '../auth.js';
import { RegistryError } from '../client.js';

/**
 * Pack update command implementation
 * Updates installed packs to latest version
 */
export const packUpdateCommand: Command = {
  name: 'pack-update',
  description: 'Update installed packs',
  args: {
    pack: {
      type: 'string',
      description: 'Specific pack to update (default: all)',
    },
    registry: {
      type: 'string',
      description: 'Registry to use (default: default)',
    },
  },

  async execute(context) {
    const targetSlug = context.args.pack as string | undefined;
    const registry = (context.args.registry as string) || 'default';
    const packsDir = path.join(context.cwd, '.claude', 'packs');
    const skillsDir = path.join(context.cwd, '.claude', 'skills');
    const commandsDir = path.join(context.cwd, '.claude', 'commands');
    const protocolsDir = path.join(context.cwd, '.claude', 'protocols');

    const creds = getCredentials(registry);
    if (!creds) {
      console.error('Not logged in. Run /skill-login first.');
      return;
    }

    try {
      // Check if packs directory exists
      try {
        await fs.access(packsDir);
      } catch {
        console.log('No packs installed.\n');
        console.log('Use /pack-install <slug> to install a pack.');
        return;
      }

      // Get list of installed packs
      const entries = await fs.readdir(packsDir, { withFileTypes: true });
      const packDirs = entries.filter(e => e.isDirectory());

      if (packDirs.length === 0) {
        console.log('No packs installed.\n');
        console.log('Use /pack-install <slug> to install a pack.');
        return;
      }

      // Filter to specific pack if provided
      const packsToCheck = targetSlug
        ? packDirs.filter(d => d.name === targetSlug)
        : packDirs;

      if (targetSlug && packsToCheck.length === 0) {
        console.error(`Pack "${targetSlug}" is not installed.`);
        return;
      }

      const client = await getClient(registry);
      let updatedCount = 0;
      let upToDateCount = 0;
      let errorCount = 0;

      console.log('Checking for updates...\n');

      for (const dir of packsToCheck) {
        const packDir = path.join(packsDir, dir.name);
        const slug = dir.name;

        try {
          // Read current manifest
          const manifestPath = path.join(packDir, 'manifest.json');
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const currentManifest: PackManifest = JSON.parse(manifestContent);
          const currentVersion = currentManifest.version;

          // Get latest version from registry
          console.log(`Checking ${currentManifest.name}...`);

          let latestVersion: string;
          try {
            const versions = await client.getPackVersions(slug);
            const latest = versions.find(v => v.is_latest);
            if (!latest) {
              console.log(`  No versions found for ${slug}`);
              errorCount++;
              continue;
            }
            latestVersion = latest.version;
          } catch (error) {
            if (error instanceof RegistryError && error.isNotFound()) {
              console.log(`  Pack not found in registry (may have been removed)`);
              errorCount++;
              continue;
            }
            throw error;
          }

          // Compare versions
          if (currentVersion === latestVersion) {
            console.log(`  Already at latest version (${currentVersion})`);
            upToDateCount++;
            continue;
          }

          console.log(`  Update available: ${currentVersion} → ${latestVersion}`);

          // Check subscription
          const pack = await client.getPack(slug);
          if (!canAccessTier(creds.tier, pack.tier_required)) {
            console.log(`  ⚠ Update requires ${pack.tier_required} subscription`);
            errorCount++;
            continue;
          }

          // Download new version
          console.log(`  Downloading v${latestVersion}...`);
          const download = await client.downloadPack(slug, latestVersion);

          // Backup existing files (optional - we could skip this for simplicity)
          // For now, we'll just overwrite

          // Remove old skill files for this pack
          if (currentManifest.skills) {
            for (const skill of currentManifest.skills) {
              const skillDir = path.join(skillsDir, skill.slug);
              try {
                await fs.rm(skillDir, { recursive: true, force: true });
              } catch {
                // Ignore if doesn't exist
              }
            }
          }

          // Remove old command files for this pack
          if (currentManifest.commands) {
            for (const cmd of currentManifest.commands) {
              const cmdPath = path.join(commandsDir, `${cmd.name}.md`);
              try {
                await fs.unlink(cmdPath);
              } catch {
                // Ignore if doesn't exist
              }
            }
          }

          // Track installed items
          const installedSkills: string[] = [];
          const installedCommands: string[] = [];

          // Install new files
          for (const file of download.pack.files) {
            const content = Buffer.from(file.content, 'base64').toString('utf-8');

            if (file.path.startsWith('skills/')) {
              const parts = file.path.split('/');
              const skillSlug = parts[1];
              const relativePath = parts.slice(2).join('/');

              if (skillSlug && relativePath) {
                const destPath = path.join(skillsDir, skillSlug, relativePath);
                await fs.mkdir(path.dirname(destPath), { recursive: true });
                await fs.writeFile(destPath, content, 'utf-8');

                if (!installedSkills.includes(skillSlug)) {
                  installedSkills.push(skillSlug);
                }
              }
            } else if (file.path.startsWith('commands/')) {
              const commandName = path.basename(file.path);
              const destPath = path.join(commandsDir, commandName);
              await fs.mkdir(commandsDir, { recursive: true });
              await fs.writeFile(destPath, content, 'utf-8');
              installedCommands.push(commandName.replace('.md', ''));
            } else if (file.path.startsWith('protocols/')) {
              const protocolName = path.basename(file.path);
              const destPath = path.join(protocolsDir, protocolName);
              await fs.mkdir(protocolsDir, { recursive: true });
              await fs.writeFile(destPath, content, 'utf-8');
            } else {
              const destPath = path.join(packDir, file.path);
              await fs.mkdir(path.dirname(destPath), { recursive: true });
              await fs.writeFile(destPath, content, 'utf-8');
            }
          }

          // Update manifest
          await fs.writeFile(
            path.join(packDir, 'manifest.json'),
            JSON.stringify(download.pack.manifest, null, 2)
          );

          // Update license
          const licenseData: PackLicense = {
            pack: slug,
            version: download.pack.version,
            token: download.license.token,
            expires_at: download.license.expires_at,
            watermark: download.license.watermark,
            installed_at: new Date().toISOString(),
          };
          await fs.writeFile(
            path.join(packDir, '.license.json'),
            JSON.stringify(licenseData, null, 2)
          );

          console.log(`  ✓ Updated to v${latestVersion}`);

          // Show changelog if available
          try {
            const versions = await client.getPackVersions(slug);
            const newVersion = versions.find(v => v.version === latestVersion);
            if (newVersion?.changelog) {
              console.log(`  Changelog: ${newVersion.changelog.split('\n')[0]}`);
            }
          } catch {
            // Ignore changelog fetch errors
          }

          updatedCount++;

        } catch (error) {
          console.error(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
        }
      }

      // Summary
      console.log('\n' + '─'.repeat(40));
      console.log(`Updated: ${updatedCount}, Up to date: ${upToDateCount}, Errors: ${errorCount}`);

      if (errorCount > 0 && updatedCount === 0) {
        console.log('\nSome updates failed. Check your subscription or try again later.');
      }

    } catch (error) {
      console.error('Update failed:', error);
      throw error;
    }
  },
};
