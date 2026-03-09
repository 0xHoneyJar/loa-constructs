/**
 * OAuth Routes
 * @see sprint.md T2.3: OAuth Flows
 * @see sdd.md §1.6 External Integrations - GitHub OAuth, Google OAuth
 */

import { Hono, type Context } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db, users } from '../db/index.js';
import { generateTokens } from '../services/auth.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

// --- Types ---

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

interface GoogleUser {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

// --- Constants ---

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

// --- Helper Functions ---

/**
 * Parse cookies from Cookie header
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}

/**
 * Verify OAuth state parameter against stored cookie
 * Returns true if valid, false otherwise
 */
function verifyOAuthState(c: Context, state: string): boolean {
  const cookieHeader = c.req.header('Cookie');
  const cookies = parseCookies(cookieHeader);
  const storedState = cookies['oauth_state'];
  return storedState === state;
}

function getBaseUrl(): string {
  return env.NODE_ENV === 'production'
    ? 'https://api.constructs.network'
    : 'http://localhost:3001';
}

function getDashboardUrl(): string {
  return env.NODE_ENV === 'production'
    ? 'https://constructs.network'
    : 'http://localhost:3001';
}

/**
 * Find or create user from OAuth data
 */
async function findOrCreateOAuthUser(
  provider: 'github' | 'google',
  oauthId: string,
  email: string,
  name: string,
  avatarUrl?: string,
  github?: { username: string; userId: number; isOrgMember?: boolean }
): Promise<{ id: string; email: string; name: string; emailVerified: boolean; isNew: boolean; githubOrgMember: boolean }> {
  // GitHub-specific fields for org membership tracking (cycle-038)
  // When isOrgMember is undefined, the org check failed — preserve existing DB value.
  const githubFields = github
    ? {
        githubUsername: github.username,
        githubUserId: github.userId,
        ...(github.isOrgMember !== undefined
          ? { githubOrgMember: github.isOrgMember, githubOrgCheckedAt: new Date() }
          : {}),
      }
    : {};

  // First, try to find by OAuth provider + ID
  const [existingOAuth] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      githubOrgMember: users.githubOrgMember,
    })
    .from(users)
    .where(and(eq(users.oauthProvider, provider), eq(users.oauthId, oauthId)))
    .limit(1);

  if (existingOAuth) {
    // Update org membership on every login (it may have changed)
    if (github) {
      await db
        .update(users)
        .set({ ...githubFields, updatedAt: new Date() })
        .where(eq(users.id, existingOAuth.id));
    }
    return {
      ...existingOAuth,
      emailVerified: existingOAuth.emailVerified ?? false,
      githubOrgMember: github?.isOrgMember ?? existingOAuth.githubOrgMember ?? false,
      isNew: false,
    };
  }

  // Try to find by email and link accounts
  const [existingEmail] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      githubOrgMember: users.githubOrgMember,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existingEmail) {
    // Link OAuth to existing account + update org membership
    await db
      .update(users)
      .set({
        oauthProvider: provider,
        oauthId: oauthId,
        emailVerified: true, // OAuth emails are verified
        avatarUrl: avatarUrl || existingEmail.email,
        ...githubFields,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingEmail.id));

    return {
      ...existingEmail,
      emailVerified: true,
      githubOrgMember: github?.isOrgMember ?? existingEmail.githubOrgMember ?? false,
      isNew: false,
    };
  }

  // Create new user
  const [newUser] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name,
      avatarUrl,
      oauthProvider: provider,
      oauthId: oauthId,
      emailVerified: true, // OAuth emails are considered verified
      ...githubFields,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      githubOrgMember: users.githubOrgMember,
    });

  return {
    ...newUser,
    emailVerified: newUser.emailVerified ?? false,
    githubOrgMember: newUser.githubOrgMember ?? false,
    isNew: true,
  };
}

// --- Routes ---

const oauth = new Hono();

// === GitHub OAuth ===

/**
 * GET /v1/auth/oauth/github
 * Start GitHub OAuth flow
 */
oauth.get('/github', async (c) => {
  if (!env.GITHUB_CLIENT_ID) {
    throw Errors.InternalError('GitHub OAuth not configured');
  }

  const state = crypto.randomUUID();
  const redirectUri = `${getBaseUrl()}/v1/auth/oauth/github/callback`;

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'user:email read:org',
    state,
  });

  // Store state in cookie for verification
  c.header('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

  return c.redirect(`${GITHUB_AUTH_URL}?${params.toString()}`);
});

/**
 * GET /v1/auth/oauth/github/callback
 * Handle GitHub OAuth callback
 */
oauth.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');
  const requestId = c.get('requestId');

  if (error) {
    logger.warn({ error, requestId }, 'GitHub OAuth error');
    return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_denied`);
  }

  if (!code || !state) {
    return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_invalid`);
  }

  // Verify state matches cookie to prevent CSRF attacks
  if (!verifyOAuthState(c, state)) {
    logger.warn({ requestId }, 'GitHub OAuth state mismatch - possible CSRF attempt');
    return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_invalid_state`);
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw Errors.InternalError('GitHub OAuth not configured');
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      logger.error({ tokenData, requestId }, 'GitHub token exchange failed');
      return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_failed`);
    }

    // Fetch user info
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    const githubUser = await userResponse.json() as GitHubUser;

    // Fetch emails if not public
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      });

      const emails = await emailsResponse.json() as GitHubEmail[];
      const primaryEmail = emails.find(e => e.primary && e.verified);
      email = primaryEmail?.email || emails.find(e => e.verified)?.email || null;
    }

    if (!email) {
      logger.warn({ githubUser: githubUser.id, requestId }, 'No verified email from GitHub');
      return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_no_email`);
    }

    // Check GitHub org membership (cycle-038)
    // Distinguish "API confirmed not-member" from "API call failed" —
    // on failure, returning users preserve their existing DB value.
    let isOrgMember = false;
    let orgCheckSucceeded = true;
    try {
      const orgResponse = await fetch(
        `https://api.github.com/orgs/${env.CONSTRUCTS_ORG}/members/${githubUser.login}`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
          },
        }
      );
      if (orgResponse.status === 204) {
        // Confirmed member
        isOrgMember = true;
      } else if (orgResponse.status === 302 || orgResponse.status === 404) {
        // Confirmed not member
        isOrgMember = false;
      } else {
        // Transient/unknown failure (5xx, 429, etc.) — preserve existing DB value (GPT review F4)
        orgCheckSucceeded = false;
        logger.warn(
          { status: orgResponse.status, userId: githubUser.id, requestId },
          'GitHub org membership check returned non-authoritative status; preserving existing value'
        );
      }
    } catch (orgErr) {
      orgCheckSucceeded = false;
      logger.warn({ error: orgErr, userId: githubUser.id, requestId }, 'Failed to check GitHub org membership');
    }

    // Find or create user — always pass github identity, but isOrgMember is
    // undefined when the org check failed so returning users preserve their DB value.
    const user = await findOrCreateOAuthUser(
      'github',
      githubUser.id.toString(),
      email,
      githubUser.name || githubUser.login,
      githubUser.avatar_url,
      {
        username: githubUser.login,
        userId: githubUser.id,
        isOrgMember: orgCheckSucceeded ? isOrgMember : undefined,
      }
    );

    // Generate tokens — pass org membership for visibility (cycle-038)
    const tokens = await generateTokens(user.id, user.email, user.githubOrgMember);

    logger.info({ userId: user.id, isNew: user.isNew, isOrgMember, requestId }, 'GitHub OAuth successful');

    // Redirect to dashboard with tokens in URL fragment (handled by client)
    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn.toString(),
    });

    return c.redirect(`${getDashboardUrl()}/auth/callback?${params.toString()}`);
  } catch (err) {
    logger.error({ error: err, requestId }, 'GitHub OAuth error');
    return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_failed`);
  }
});

// === Google OAuth ===

/**
 * GET /v1/auth/oauth/google
 * Start Google OAuth flow
 */
oauth.get('/google', async (c) => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw Errors.InternalError('Google OAuth not configured');
  }

  const state = crypto.randomUUID();
  const redirectUri = `${getBaseUrl()}/v1/auth/oauth/google/callback`;

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  // Store state in cookie for verification
  c.header('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

  return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

/**
 * GET /v1/auth/oauth/google/callback
 * Handle Google OAuth callback
 */
oauth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');
  const requestId = c.get('requestId');

  if (error) {
    logger.warn({ error, requestId }, 'Google OAuth error');
    return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_denied`);
  }

  if (!code || !state) {
    return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_invalid`);
  }

  // Verify state matches cookie to prevent CSRF attacks
  if (!verifyOAuthState(c, state)) {
    logger.warn({ requestId }, 'Google OAuth state mismatch - possible CSRF attempt');
    return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_invalid_state`);
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw Errors.InternalError('Google OAuth not configured');
  }

  try {
    const redirectUri = `${getBaseUrl()}/v1/auth/oauth/google/callback`;

    // Exchange code for token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; id_token?: string; error?: string };

    if (!tokenData.access_token) {
      logger.error({ tokenData, requestId }, 'Google token exchange failed');
      return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_failed`);
    }

    // Fetch user info
    const userResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userResponse.json() as GoogleUser;

    if (!googleUser.email || !googleUser.email_verified) {
      logger.warn({ googleUser: googleUser.sub, requestId }, 'No verified email from Google');
      return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_no_email`);
    }

    // Find or create user
    const user = await findOrCreateOAuthUser(
      'google',
      googleUser.sub,
      googleUser.email,
      googleUser.name,
      googleUser.picture
    );

    // Generate tokens — preserve org membership from prior GitHub link (cycle-038)
    const tokens = await generateTokens(user.id, user.email, user.githubOrgMember);

    logger.info({ userId: user.id, isNew: user.isNew, requestId }, 'Google OAuth successful');

    // Redirect to dashboard with tokens
    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn.toString(),
    });

    return c.redirect(`${getDashboardUrl()}/auth/callback?${params.toString()}`);
  } catch (err) {
    logger.error({ error: err, requestId }, 'Google OAuth error');
    return c.redirect(`${getDashboardUrl()}/auth/login?error=oauth_failed`);
  }
});

export { oauth };
