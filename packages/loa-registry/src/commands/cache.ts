/**
 * Cache Management Command
 * @see sprint.md T8.5: Offline Cache
 */

import type { Command } from '../types.js';
import { clearCache, clearSkillCache, getCacheSize, formatBytes } from '../cache.js';

/**
 * Cache command implementation
 * Manages the skill download cache
 */
export const cacheCommand: Command = {
  name: 'skill-cache',
  description: 'Manage the skill download cache',
  args: {
    action: {
      type: 'string',
      required: true,
      description: 'Action: clear, clear-skill, info',
    },
    skill: {
      type: 'string',
      description: 'Skill slug (for clear-skill action)',
    },
  },

  async execute(context) {
    const action = context.args.action as string;
    const skill = context.args.skill as string | undefined;

    switch (action) {
      case 'clear':
        console.log('Clearing all cached skills...');
        await clearCache();
        console.log('✓ Cache cleared');
        break;

      case 'clear-skill':
        if (!skill) {
          console.error('Usage: /skill-cache clear-skill --skill <slug>');
          return;
        }
        console.log(`Clearing cache for ${skill}...`);
        await clearSkillCache(skill);
        console.log('✓ Cache cleared for ' + skill);
        break;

      case 'info':
        const size = await getCacheSize();
        console.log('CACHE INFO\n');
        console.log(`Size: ${formatBytes(size)}`);
        console.log(`Location: ~/.loa-registry/cache/skills/`);
        console.log('\nTo clear: /skill-cache clear');
        break;

      default:
        console.error(`Unknown action: ${action}`);
        console.log('\nAvailable actions:');
        console.log('  clear       - Clear all cached skills');
        console.log('  clear-skill - Clear cache for a specific skill');
        console.log('  info        - Show cache information');
    }
  },
};
