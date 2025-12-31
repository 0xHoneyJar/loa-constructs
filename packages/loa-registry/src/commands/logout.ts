/**
 * Logout Command
 * @see sprint.md T7.4: Login Command (includes logout)
 */

import type { Command } from '../types.js';
import { removeCredentials, isAuthenticated } from '../auth.js';

/**
 * Logout command implementation
 */
export const logoutCommand: Command = {
  name: 'skill-logout',
  description: 'Log out from the Skills Registry',
  args: {
    registry: {
      type: 'string',
      description: 'Registry name to log out from (default: default)',
    },
  },

  async execute(context) {
    const registry = (context.args.registry as string) || 'default';

    if (!isAuthenticated(registry)) {
      console.log(`Not logged in to registry "${registry}"`);
      return;
    }

    removeCredentials(registry);
    console.log(`Logged out from registry "${registry}"`);
    console.log('\nTo log in again, run: /skill-login');
  },
};
