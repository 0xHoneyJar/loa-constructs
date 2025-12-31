/**
 * Search Command
 * @see sprint.md T7.6: Search Command
 */

import type { Command } from '../types.js';
import { getClient, getCredentials, canAccessTier } from '../auth.js';

/**
 * Search command implementation
 * Search for skills in the registry
 */
export const searchCommand: Command = {
  name: 'skill-search',
  description: 'Search for skills in the registry',
  args: {
    query: {
      type: 'string',
      required: true,
      description: 'Search query',
    },
    category: {
      type: 'string',
      description: 'Filter by category (development, devops, marketing, etc.)',
    },
    tier: {
      type: 'string',
      description: 'Filter by tier (free, pro, team, enterprise)',
    },
    registry: {
      type: 'string',
      description: 'Registry to search (default: default)',
    },
  },

  async execute(context) {
    const query = context.args.query as string;
    const category = context.args.category as string | undefined;
    const tier = context.args.tier as string | undefined;
    const registry = (context.args.registry as string) || 'default';

    if (!query) {
      console.error('Usage: /skill-search <query> [--category <cat>] [--tier <tier>]');
      console.log('\nCategories: development, devops, marketing, sales, support, analytics, security, other');
      console.log('Tiers: free, pro, team, enterprise');
      return;
    }

    const creds = getCredentials(registry);
    if (!creds) {
      console.error('Not logged in. Run /skill-login first.');
      return;
    }

    const userTier = creds.tier;

    try {
      const client = await getClient(registry);
      console.log(`Searching for "${query}"...\n`);

      const response = await client.listSkills({
        query,
        category,
        tier,
        perPage: 20,
      });

      if (response.data.length === 0) {
        console.log('No skills found matching your search.');
        console.log('\nTry:');
        console.log('  - Using different keywords');
        console.log('  - Removing filters');
        console.log('  - Running /skill-list to see all available skills');
        return;
      }

      console.log('SEARCH RESULTS\n');
      console.log(`Found ${response.pagination.total} skill(s):\n`);

      // Display results in table format
      const maxNameLen = Math.max(...response.data.map(s => s.slug.length), 20);

      for (const skill of response.data) {
        const accessible = canAccessTier(userTier, skill.tier_required);
        const accessIcon = accessible ? ' ' : 'x';
        const tierBadge = skill.tier_required === 'free' ? '' : `[${skill.tier_required}]`;

        // Format: [x] skill-name       [tier] downloads  rating
        const name = skill.slug.padEnd(maxNameLen);
        const downloads = `${formatNumber(skill.downloads)} downloads`;
        const rating = skill.rating ? `${skill.rating.toFixed(1)} rating` : 'No ratings';

        console.log(`[${accessIcon}] ${name} ${tierBadge}`);
        console.log(`    ${skill.description || 'No description'}`);
        console.log(`    ${downloads} | ${rating} | ${skill.category}`);
        console.log('');
      }

      // Show pagination
      if (response.pagination.total_pages > 1) {
        console.log(`\nShowing ${response.data.length} of ${response.pagination.total} results`);
      }

      // Show legend
      console.log('\nLegend: [ ] = available, [x] = needs upgrade');
      console.log('\nUse /skill-info <slug> for detailed information');
      console.log('Use /skill-install <slug> to install a skill');
    } catch (error) {
      console.error('Search failed:', error);
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
