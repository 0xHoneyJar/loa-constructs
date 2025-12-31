/**
 * Info Command
 * @see sprint.md T7.7: Info Command
 */

import type { Command } from '../types.js';
import { getClient, getCredentials, canAccessTier } from '../auth.js';
import { RegistryError } from '../client.js';
import { isInstalled } from '../cache.js';

/**
 * Info command implementation
 * Display detailed information about a skill
 */
export const infoCommand: Command = {
  name: 'skill-info',
  description: 'Display detailed information about a skill',
  args: {
    skill: {
      type: 'string',
      required: true,
      description: 'Skill slug to get info for',
    },
    registry: {
      type: 'string',
      description: 'Registry to query (default: default)',
    },
  },

  async execute(context) {
    const slug = context.args.skill as string;
    const registry = (context.args.registry as string) || 'default';

    if (!slug) {
      console.error('Usage: /skill-info <skill-slug>');
      console.log('\nExample: /skill-info terraform-assistant');
      return;
    }

    const creds = getCredentials(registry);
    if (!creds) {
      console.error('Not logged in. Run /skill-login first.');
      return;
    }

    try {
      const client = await getClient(registry);
      console.log(`Fetching info for ${slug}...\n`);

      const skill = await client.getSkill(slug);
      const userTier = creds.tier;
      const accessible = canAccessTier(userTier, skill.tier_required);
      const installed = await isInstalled(slug, context.cwd);

      // Header
      console.log('=' .repeat(60));
      console.log(`${skill.name}`);
      console.log('=' .repeat(60));
      console.log('');

      // Basic info
      console.log(`Slug:        ${skill.slug}`);
      console.log(`Category:    ${skill.category}`);
      console.log(`Tier:        ${skill.tier_required}${accessible ? '' : ' (upgrade required)'}`);
      console.log(`Version:     ${skill.latest_version}`);
      console.log(`Downloads:   ${formatNumber(skill.downloads)}`);
      if (skill.rating) {
        console.log(`Rating:      ${skill.rating.toFixed(1)}/5 (${skill.rating_count} reviews)`);
      }
      console.log(`Status:      ${installed ? 'Installed' : 'Not installed'}`);
      console.log('');

      // Description
      if (skill.description) {
        console.log('DESCRIPTION');
        console.log('-'.repeat(60));
        console.log(skill.description);
        console.log('');
      }

      if (skill.long_description) {
        console.log('ABOUT');
        console.log('-'.repeat(60));
        console.log(skill.long_description);
        console.log('');
      }

      // Tags
      if (skill.tags && skill.tags.length > 0) {
        console.log('TAGS');
        console.log('-'.repeat(60));
        console.log(skill.tags.join(', '));
        console.log('');
      }

      // Version history
      if (skill.versions && skill.versions.length > 0) {
        console.log('VERSION HISTORY');
        console.log('-'.repeat(60));
        const recentVersions = skill.versions.slice(0, 5);
        for (const version of recentVersions) {
          const latest = version.is_latest ? ' (latest)' : '';
          const date = version.published_at
            ? new Date(version.published_at).toLocaleDateString()
            : 'Unknown';
          console.log(`  v${version.version}${latest} - ${date}`);
          if (version.changelog) {
            console.log(`    ${version.changelog.slice(0, 80)}${version.changelog.length > 80 ? '...' : ''}`);
          }
        }
        if (skill.versions.length > 5) {
          console.log(`  ... and ${skill.versions.length - 5} more versions`);
        }
        console.log('');
      }

      // Owner
      console.log('OWNER');
      console.log('-'.repeat(60));
      console.log(`  ${skill.owner.name} (${skill.owner.type})`);
      console.log('');

      // Links
      if (skill.repository_url || skill.documentation_url) {
        console.log('LINKS');
        console.log('-'.repeat(60));
        if (skill.repository_url) {
          console.log(`  Repository:    ${skill.repository_url}`);
        }
        if (skill.documentation_url) {
          console.log(`  Documentation: ${skill.documentation_url}`);
        }
        console.log('');
      }

      // Installation instructions
      console.log('INSTALLATION');
      console.log('-'.repeat(60));
      if (accessible) {
        if (installed) {
          console.log('  This skill is already installed.');
          console.log('  To update: /skill-update ' + slug);
          console.log('  To remove: /skill-uninstall ' + slug);
        } else {
          console.log('  To install this skill, run:');
          console.log(`  /skill-install ${slug}`);
        }
      } else {
        console.log(`  This skill requires a ${skill.tier_required} subscription.`);
        console.log(`  Your current tier: ${userTier}`);
        console.log('');
        console.log('  Upgrade at: https://loaskills.dev/billing');
      }
      console.log('');
    } catch (error) {
      if (error instanceof RegistryError) {
        if (error.isNotFound()) {
          console.error(`Skill "${slug}" not found.`);
          console.log('\nUse /skill-search to find available skills.');
          return;
        }
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Failed to fetch skill info:', error);
      }
      throw error;
    }
  },
};

/**
 * Format number with K/M suffix for large numbers
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return String(num);
}
