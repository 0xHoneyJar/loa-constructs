/**
 * Pack Install Command
 * @see sprint-v2.md T15.1: CLI Pack Install Command
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Command } from '../types.js';
import type { PackLicense } from '@loa-constructs/shared';
import { getClient, getCredentials, canAccessTier } from '../auth.js';
import { RegistryError } from '../client.js';

/**
 * Pack install command implementation
 * Downloads and installs a pack from the registry
 */
export const packInstallCommand: Command = {
  name: 'pack-install',
  description: 'Install a pack from the registry',
  args: {
    pack: {
      type: 'string',
      required: true,
      description: 'Pack slug to install',
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
    const slug = context.args.pack as string;
    const version = context.args.version as string | undefined;
    const registry = (context.args.registry as string) || 'default';

    if (!slug) {
      console.error('Usage: /pack-install <pack-slug> [--version <version>]');
      console.log('\nExample: /pack-install gtm-collective');
      console.log('         /pack-install gtm-collective --version 1.0.0');
      return;
    }

    const creds = getCredentials(registry);
    if (!creds) {
      console.error('Not logged in. Run /skill-login first.');
      return;
    }

    try {
      const client = await getClient(registry);

      // 1. Get pack info to check tier requirement
      console.log(`Fetching pack info for ${slug}...`);
      const pack = await client.getPack(slug);

      // 2. Check subscription tier
      const userTier = creds.tier;
      if (!canAccessTier(userTier, pack.tier_required)) {
        console.error(`\nThis pack requires a ${pack.tier_required} subscription.`);
        console.log(`Your current tier: ${userTier}`);
        console.log('\nPricing:');
        console.log('  Pro:        $29/month or $290/year');
        console.log('  Team:       $99/month or $990/year');
        console.log('  Enterprise: Contact sales');
        console.log('\nUpgrade at: https://constructs.network/billing');
        return;
      }

      // 3. Download pack files
      const targetVersion = version || pack.latest_version_info?.version || pack.latest_version;
      console.log(`Downloading ${pack.name} v${targetVersion}...`);

      let download;
      try {
        download = await client.downloadPack(slug, targetVersion);
      } catch (error) {
        if (error instanceof RegistryError && error.status === 402) {
          // Subscription required
          const details = error.details as { tier_required?: string; pricing?: Record<string, string> } | undefined;
          console.error(`\nThis pack requires a ${details?.tier_required || 'paid'} subscription.`);
          console.log(`Your current tier: ${userTier}`);
          if (details?.pricing) {
            console.log('\nPricing:');
            Object.entries(details.pricing).forEach(([key, value]) => {
              console.log(`  ${key}: ${value}`);
            });
          }
          console.log('\nUpgrade at: https://constructs.network/billing');
          return;
        }
        throw error;
      }

      // 4. Determine install directories
      const packDir = path.join(context.cwd, '.claude', 'packs', slug);
      const skillsDir = path.join(context.cwd, '.claude', 'skills');
      const commandsDir = path.join(context.cwd, '.claude', 'commands');
      const protocolsDir = path.join(context.cwd, '.claude', 'protocols');

      // 5. Check if already installed
      try {
        await fs.access(packDir);
        console.log(`\nPack "${slug}" is already installed.`);
        console.log('Use /pack-update to update, or uninstall first.');
        return;
      } catch {
        // Not installed, continue
      }

      // 6. Create pack directory
      console.log(`Installing to ${packDir}...`);
      await fs.mkdir(packDir, { recursive: true });

      // Track installed items
      const installedSkills: string[] = [];
      const installedCommands: string[] = [];
      const installedProtocols: string[] = [];
      let totalBytes = 0;
      let hasReadme = false;

      // 7. Process files based on manifest
      const manifest = download.pack.manifest;

      for (const file of download.pack.files) {
        // Decode base64 content
        const content = Buffer.from(file.content, 'base64').toString('utf-8');
        totalBytes += content.length;

        // Determine destination based on file path
        if (file.path.startsWith('skills/')) {
          // Extract skill slug from path (e.g., "skills/analyzing-market/SKILL.md")
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
          // Commands go directly to .claude/commands/
          const commandName = path.basename(file.path);
          const destPath = path.join(commandsDir, commandName);
          await fs.mkdir(commandsDir, { recursive: true });
          await fs.writeFile(destPath, content, 'utf-8');
          installedCommands.push(commandName.replace('.md', ''));
        } else if (file.path.startsWith('protocols/')) {
          // Protocols go to .claude/protocols/
          const protocolName = path.basename(file.path);
          const destPath = path.join(protocolsDir, protocolName);
          await fs.mkdir(protocolsDir, { recursive: true });
          await fs.writeFile(destPath, content, 'utf-8');
          installedProtocols.push(protocolName.replace('.md', ''));
        } else if (file.path === 'README.md') {
          // README goes to pack directory
          const destPath = path.join(packDir, 'README.md');
          await fs.writeFile(destPath, content, 'utf-8');
          hasReadme = true;
        } else {
          // Other files go into the pack directory
          const destPath = path.join(packDir, file.path);
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.writeFile(destPath, content, 'utf-8');
        }
      }

      // 8. Write manifest to pack directory
      await fs.writeFile(
        path.join(packDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // 9. Write license file
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

      // 10. Update .gitignore to protect licensed content
      const gitignoreUpdates = await updateGitignore(
        context.cwd,
        slug,
        installedSkills,
        installedCommands,
        installedProtocols
      );

      // 11. Success message
      console.log(`\nInstalling ${pack.name} v${download.pack.version}...\n`);
      console.log(`✓ Verified subscription`);
      console.log(`✓ Downloaded ${download.pack.files.length} files (${formatBytes(totalBytes)})`);
      if (installedSkills.length > 0) {
        console.log(`✓ Installed ${installedSkills.length} skills`);
      }
      if (installedCommands.length > 0) {
        console.log(`✓ Installed ${installedCommands.length} commands`);
      }
      if (installedProtocols.length > 0) {
        console.log(`✓ Installed ${installedProtocols.length} protocols`);
      }
      if (gitignoreUpdates > 0) {
        console.log(`✓ Updated .gitignore (${gitignoreUpdates} entries added)`);
      }

      // License info
      const expiresAt = new Date(download.license.expires_at);
      console.log(`✓ License valid until ${expiresAt.toLocaleDateString()}`);

      console.log(`\n${pack.name} installed successfully!`);

      // Show README location if present
      if (hasReadme) {
        console.log(`\nDocumentation: .claude/packs/${slug}/README.md`);
      }

      // Show available commands
      if (installedCommands.length > 0) {
        console.log('\nAvailable commands:');
        installedCommands.slice(0, 10).forEach(cmd => {
          console.log(`  /${cmd}`);
        });
        if (installedCommands.length > 10) {
          console.log(`  ... and ${installedCommands.length - 10} more`);
        }
      }

    } catch (error) {
      if (error instanceof RegistryError) {
        if (error.isNotFound()) {
          console.error(`Pack "${slug}" not found.`);
          console.log('\nUse /pack-search to find available packs.');
          return;
        }
        if (error.isTierRequired()) {
          console.error(`\nThis pack requires a higher subscription tier.`);
          console.log('Upgrade at: https://constructs.network/billing');
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

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Update .gitignore to exclude installed pack content
 * This prevents licensed/premium content from being accidentally committed
 * @returns Number of entries added
 */
async function updateGitignore(
  cwd: string,
  packSlug: string,
  skills: string[],
  commands: string[],
  protocols: string[]
): Promise<number> {
  const gitignorePath = path.join(cwd, '.gitignore');
  let existingContent = '';

  // Read existing .gitignore if it exists
  try {
    existingContent = await fs.readFile(gitignorePath, 'utf-8');
  } catch {
    // File doesn't exist, will create new
  }

  const existingLines = new Set(existingContent.split('\n').map(l => l.trim()));
  const newEntries: string[] = [];

  // Pack directory
  const packEntry = `.claude/packs/${packSlug}/`;
  if (!existingLines.has(packEntry)) {
    newEntries.push(packEntry);
  }

  // Skills
  for (const skill of skills) {
    const entry = `.claude/skills/${skill}/`;
    if (!existingLines.has(entry)) {
      newEntries.push(entry);
    }
  }

  // Commands
  for (const command of commands) {
    const entry = `.claude/commands/${command}.md`;
    if (!existingLines.has(entry)) {
      newEntries.push(entry);
    }
  }

  // Protocols
  for (const protocol of protocols) {
    const entry = `.claude/protocols/${protocol}.md`;
    if (!existingLines.has(entry)) {
      newEntries.push(entry);
    }
  }

  // If nothing to add, return early
  if (newEntries.length === 0) {
    return 0;
  }

  // Build the new section
  const sectionHeader = `\n# loa-registry: ${packSlug} (licensed content - do not commit)`;
  const newSection = [sectionHeader, ...newEntries].join('\n');

  // Append to .gitignore
  const updatedContent = existingContent.trimEnd() + '\n' + newSection + '\n';
  await fs.writeFile(gitignorePath, updatedContent, 'utf-8');

  return newEntries.length;
}
