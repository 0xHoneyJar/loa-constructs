/**
 * Login Command
 * @see sprint.md T7.4: Login Command
 */

import * as readline from 'readline';
import type { Command, Credentials } from '../types.js';
import { RegistryClient, RegistryError } from '../client.js';
import {
  getRegistryUrl,
  getCredentials,
  saveCredentials,
  isAuthenticated,
} from '../auth.js';

/**
 * Prompt user for input
 */
async function prompt(question: string, options?: { hidden?: boolean }): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (options?.hidden) {
      // Hide password input
      process.stdout.write(question);
      let password = '';

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char: string) => {
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl+D
            process.stdin.setRawMode(false);
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            rl.close();
            resolve(password);
            break;
          case '\u0003': // Ctrl+C
            process.exit();
            break;
          case '\u007F': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.clearLine(0);
              process.stdout.cursorTo(0);
              process.stdout.write(question + '*'.repeat(password.length));
            }
            break;
          default:
            password += char;
            process.stdout.write('*');
        }
      };

      process.stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Login command implementation
 */
export const loginCommand: Command = {
  name: 'skill-login',
  description: 'Authenticate with the Skills Registry',
  args: {
    registry: {
      type: 'string',
      description: 'Registry name to authenticate with (default: default)',
    },
  },

  async execute(context) {
    const registry = (context.args.registry as string) || 'default';

    console.log('Logging in to Skills Registry...\n');

    // Check for existing API key from environment
    const existingKey = process.env.LOA_SKILLS_API_KEY;
    if (existingKey) {
      console.log('Using API key from LOA_SKILLS_API_KEY environment variable');

      const client = new RegistryClient({
        url: getRegistryUrl(registry),
        apiKey: existingKey,
      });

      try {
        const user = await client.getCurrentUser();

        const credentials: Credentials = {
          type: 'api_key',
          key: existingKey,
          userId: user.id,
          tier: user.effective_tier,
          expiresAt: null,
        };
        saveCredentials(registry, credentials);

        console.log(`\nLogged in as ${user.email} (${user.effective_tier} tier)`);

        if (user.subscription) {
          console.log(`\nSubscription: ${user.subscription.tier}`);
          console.log(`Status: ${user.subscription.status}`);
          if (user.subscription.current_period_end) {
            const renewDate = new Date(user.subscription.current_period_end);
            console.log(`Renews: ${renewDate.toLocaleDateString()}`);
          }
        }
        return;
      } catch (error) {
        if (error instanceof RegistryError) {
          console.error(`Error: ${error.message}`);
          if (error.isAuthError()) {
            console.log('\nThe API key appears to be invalid. Please check your LOA_SKILLS_API_KEY.');
          }
        } else {
          console.error('Failed to authenticate:', error);
        }
        throw error;
      }
    }

    // Check if already authenticated
    if (isAuthenticated(registry)) {
      const existingCreds = getCredentials(registry);
      if (existingCreds) {
        console.log(`Already authenticated with tier: ${existingCreds.tier}`);
        const reauth = await prompt('Re-authenticate? (y/N): ');
        if (reauth.toLowerCase() !== 'y') {
          return;
        }
      }
    }

    // Interactive login
    console.log('Please enter your credentials:\n');
    const email = await prompt('Email: ');
    const password = await prompt('Password: ', { hidden: true });

    if (!email || !password) {
      console.error('Email and password are required');
      return;
    }

    const client = new RegistryClient({
      url: getRegistryUrl(registry),
    });

    try {
      console.log('\nAuthenticating...');
      const tokens = await client.login(email, password);

      // Get user info with new token
      const authedClient = new RegistryClient({
        url: getRegistryUrl(registry),
        accessToken: tokens.access_token,
      });
      const user = await authedClient.getCurrentUser();

      // Save credentials
      const credentials: Credentials = {
        type: 'oauth',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        userId: user.id,
        tier: user.effective_tier,
      };
      saveCredentials(registry, credentials);

      console.log(`\nLogged in as ${user.email} (${user.effective_tier} tier)`);

      if (user.subscription) {
        console.log(`\nSubscription: ${user.subscription.tier}`);
        console.log(`Status: ${user.subscription.status}`);
        if (user.subscription.current_period_end) {
          const renewDate = new Date(user.subscription.current_period_end);
          console.log(`Renews: ${renewDate.toLocaleDateString()}`);
        }
      }
    } catch (error) {
      if (error instanceof RegistryError) {
        console.error(`\nLogin failed: ${error.message}`);
        if (error.code === 'INVALID_CREDENTIALS') {
          console.log('Please check your email and password.');
        } else if (error.code === 'EMAIL_NOT_VERIFIED') {
          console.log('Please verify your email before logging in.');
        }
      } else {
        console.error('Login failed:', error);
      }
      throw error;
    }
  },
};
