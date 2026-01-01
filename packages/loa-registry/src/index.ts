/**
 * Loa Constructs CLI Plugin
 * @see sprint.md T7.1: Plugin Structure
 *
 * This plugin adds commands to Loa CLI for:
 * - Authenticating with Loa Constructs
 * - Browsing, installing, and updating constructs
 * - Managing API keys and subscriptions
 * - Validating construct licenses at runtime
 */

import type { LoaPlugin } from './types.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { infoCommand } from './commands/info.js';
import { installCommand } from './commands/install.js';
import { uninstallCommand } from './commands/uninstall.js';
import { updateCommand } from './commands/update.js';
import { cacheCommand } from './commands/cache.js';
import { packInstallCommand } from './commands/pack-install.js';
import { packListCommand } from './commands/pack-list.js';
import { packUpdateCommand } from './commands/pack-update.js';

/**
 * Loa Constructs Plugin
 * Provides constructs registry integration for Loa CLI
 */
export const registryPlugin: LoaPlugin = {
  name: 'loa-constructs',
  version: '0.3.0',
  description: 'Loa Constructs integration for Loa CLI',

  commands: [
    loginCommand,
    logoutCommand,
    listCommand,
    searchCommand,
    infoCommand,
    installCommand,
    uninstallCommand,
    updateCommand,
    cacheCommand,
    // Pack commands
    packInstallCommand,
    packListCommand,
    packUpdateCommand,
  ],
};

export default registryPlugin;

// Re-export types
export * from './types.js';

// Re-export client for direct use
export { RegistryClient, RegistryError, DEFAULT_REGISTRY_URL } from './client.js';

// Re-export auth utilities
export {
  getRegistryUrl,
  getCredentials,
  saveCredentials,
  removeCredentials,
  isAuthenticated,
  getClient,
  addRegistry,
  getRegistries,
  getDefaultRegistry,
  getConfigPath,
  canAccessTier,
} from './auth.js';

// Re-export cache utilities
export {
  cacheSkill,
  getCachedSkill,
  isInstalled,
  getInstalledSkills,
  getCachedSkillInfo,
  clearCache,
  clearSkillCache,
  getCacheSize,
  formatBytes,
} from './cache.js';

// Re-export license validation utilities
export {
  validateSkillLicense,
  hasValidLicense,
  getLicenseStatus,
  skillBeforeLoadHook,
} from './license.js';
export type { LicenseValidationResult } from './license.js';
