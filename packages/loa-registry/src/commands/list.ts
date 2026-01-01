/**
 * List Command
 * @see sprint.md T7.5: List Command
 */

import type { Command, SkillSummary } from '../types.js';
import { getClient, getCredentials, canAccessTier } from '../auth.js';
import { getInstalledSkills, isInstalled } from '../cache.js';

/**
 * List command implementation
 * Shows installed and/or available skills
 */
export const listCommand: Command = {
  name: 'skill-list',
  description: 'List installed and available skills',
  args: {
    installed: {
      type: 'boolean',
      description: 'Show only installed skills',
    },
    available: {
      type: 'boolean',
      description: 'Show available skills from registry',
    },
    registry: {
      type: 'string',
      description: 'Registry to query (default: default)',
    },
  },

  async execute(context) {
    const installed = context.args.installed as boolean | undefined;
    const available = context.args.available as boolean | undefined;
    const registry = (context.args.registry as string) || 'default';

    // Default: show both if neither flag specified
    const showInstalled = installed || (!installed && !available);
    const showAvailable = available || (!installed && !available);

    const creds = getCredentials(registry);
    const userTier = creds?.tier || 'free';

    // Show installed skills
    if (showInstalled) {
      console.log('INSTALLED SKILLS\n');

      const installedSkills = await getInstalledSkills(context.cwd);

      if (installedSkills.length === 0) {
        console.log('   No skills installed yet.');
        console.log('   Install with: /skill-install <skill-name>\n');
      } else {
        for (const skill of installedSkills) {
          const status = skill.licenseValid ? '[OK]' : '[!]';
          console.log(`   ${status} ${skill.name} (v${skill.version})`);
          if (!skill.licenseValid) {
            console.log(`       License expired - run /skill-update ${skill.slug}`);
          } else if (skill.expiresAt) {
            const expiresAt = new Date(skill.expiresAt);
            const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            if (daysLeft <= 7) {
              console.log(`       License expires in ${daysLeft} day(s)`);
            }
          }
        }
        console.log('');
      }
    }

    // Show available skills
    if (showAvailable) {
      if (!creds) {
        console.log('AVAILABLE SKILLS\n');
        console.log('   Not logged in. Run /skill-login to see available skills.\n');
        return;
      }

      try {
        const client = await getClient(registry);
        const response = await client.listSkills({ perPage: 50 });

        console.log('AVAILABLE SKILLS\n');

        if (response.data.length === 0) {
          console.log('   No skills available.\n');
          return;
        }

        // Group by tier access
        const accessible: SkillSummary[] = [];
        const needsUpgrade: SkillSummary[] = [];

        for (const skill of response.data) {
          if (canAccessTier(userTier, skill.tier_required)) {
            accessible.push(skill);
          } else {
            needsUpgrade.push(skill);
          }
        }

        // Show accessible skills
        if (accessible.length > 0) {
          console.log('   Available with your subscription:');
          for (const skill of accessible) {
            const isSkillInstalled = await isInstalled(skill.slug, context.cwd);
            const marker = isSkillInstalled ? '[*]' : '[ ]';
            const desc = skill.description ? skill.description.slice(0, 45) + (skill.description.length > 45 ? '...' : '') : '';
            console.log(`   ${marker} ${skill.slug}`);
            if (desc) {
              console.log(`       ${desc}`);
            }
          }
          console.log('');
        }

        // Show skills needing upgrade
        if (needsUpgrade.length > 0) {
          console.log('   Requires upgrade:');
          for (const skill of needsUpgrade) {
            const desc = skill.description ? skill.description.slice(0, 40) + (skill.description.length > 40 ? '...' : '') : '';
            console.log(`   [x] ${skill.slug} (${skill.tier_required}+)`);
            if (desc) {
              console.log(`       ${desc}`);
            }
          }
          console.log(`\n   Upgrade at: https://constructs.network/billing`);
        }

        // Show pagination info
        if (response.pagination.total_pages > 1) {
          console.log(`\n   Showing ${response.data.length} of ${response.pagination.total} skills`);
          console.log('   Use /skill-search for more filtering options');
        }
      } catch (error) {
        console.error('Failed to fetch skills:', error);
        throw error;
      }
    }

    // Show legend
    console.log('\nLegend: [*] = installed, [ ] = available, [x] = needs upgrade, [!] = license expired');
  },
};
