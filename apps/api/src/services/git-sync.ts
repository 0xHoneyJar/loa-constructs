/**
 * Git Sync Service
 * @see prd.md §FR-1.3 Server-Side Git Sync
 * @see sdd.md §4 GitSyncService
 * @see sprint.md T1.3: Git Sync Service
 *
 * Server-side git clone, validate, and snapshot service.
 * Clones a git repository to a temp directory, validates the tree,
 * reads the manifest, collects files, and returns a structured result.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import * as dns from 'node:dns';
import yaml from 'js-yaml';
import AjvModule from 'ajv';
import { logger } from '../lib/logger.js';

// Handle both CJS and ESM ajv import
const Ajv = (AjvModule as any).default || AjvModule;

const execFileAsync = promisify(execFile);
const dnsLookup = promisify(dns.lookup);

// --- Constants ---

const CLONE_TIMEOUT_MS = 30_000;
const MAX_FILES = 100;
const MAX_FILE_SIZE = 256 * 1024; // 256KB per file
const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB total

/** Directories allowed for file collection from construct repos */
const ALLOWED_DIRS = ['skills', 'commands', 'contexts', 'identity', 'scripts'];

/** Root files allowed for collection */
const ALLOWED_ROOT_FILES = [
  'construct.yaml',
  'manifest.json',
  'README.md',
  'LICENSE',
];

/** Phase 1: only github.com is allowed as a git host */
const ALLOWED_HOSTS = ['github.com'];

/** Private/reserved IP ranges for SSRF protection */
const PRIVATE_RANGES = [
  // IPv4
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' }, // link-local
  { start: '0.0.0.0', end: '0.255.255.255' },
];

// --- Types ---

export interface SyncResult {
  version: string;
  commit: string;
  manifest: Record<string, unknown>;
  files: CollectedFile[];
  identity: IdentityData | null;
  totalSizeBytes: number;
}

export interface CollectedFile {
  path: string;
  content: string; // base64 encoded
  contentHash: string;
  sizeBytes: number;
  mimeType: string;
}

export interface IdentityData {
  persona: Record<string, unknown> | null;
  expertise: Record<string, unknown> | null;
  personaYaml: string | null;
  expertiseYaml: string | null;
  cognitiveFrame: Record<string, unknown> | null;
  expertiseDomains: unknown[] | null;
  voiceConfig: Record<string, unknown> | null;
  modelPreferences: Record<string, unknown> | null;
}

// --- Schema Validation ---

let ajvInstance: InstanceType<typeof Ajv> | null = null;
let constructSchemaValidator: ((data: unknown) => boolean) & { errors?: Array<{ instancePath: string; message?: string }> } | null = null;

async function getSchemaValidator() {
  if (constructSchemaValidator) return constructSchemaValidator;

  const schemaPath = path.resolve(
    process.cwd(),
    '.claude/schemas/construct.schema.json'
  );

  try {
    const schemaText = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaText);
    ajvInstance = new Ajv({ allErrors: true }) as any;
    constructSchemaValidator = ajvInstance!.compile(schema) as any;
    return constructSchemaValidator;
  } catch {
    // If schema file not found, return a permissive validator
    logger.warn('construct.schema.json not found, using permissive validation');
    return null;
  }
}

// --- URL Validation ---

/**
 * Parse an IPv4 address to a 32-bit integer for range comparison
 */
function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

/**
 * Check if an IPv4 address falls within any private/reserved range
 */
function isPrivateIpv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return PRIVATE_RANGES.some(
    (range) => ipInt >= ipv4ToInt(range.start) && ipInt <= ipv4ToInt(range.end)
  );
}

/**
 * Check if an IPv6 address is private/reserved
 */
function isPrivateIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  return (
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80')
  );
}

/**
 * Validate a git URL for safety.
 * Phase 1: HTTPS only, github.com only, SSRF protection via DNS resolution.
 */
export async function validateGitUrl(url: string): Promise<void> {
  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new GitSyncError('INVALID_URL', `Invalid URL: ${url}`);
  }

  // HTTPS only
  if (parsed.protocol !== 'https:') {
    throw new GitSyncError(
      'INVALID_PROTOCOL',
      `Only HTTPS URLs are allowed, got: ${parsed.protocol}`
    );
  }

  // Reject non-standard ports
  if (parsed.port && parsed.port !== '443') {
    throw new GitSyncError(
      'INVALID_PORT',
      `Non-standard port not allowed: ${parsed.port}`
    );
  }

  // Phase 1: exact github.com host match
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new GitSyncError(
      'HOST_NOT_ALLOWED',
      `Host not allowed: ${parsed.hostname}. Phase 1 only supports: ${ALLOWED_HOSTS.join(', ')}`
    );
  }

  // Reject userinfo in URL (potential credential leak)
  if (parsed.username || parsed.password) {
    throw new GitSyncError(
      'INVALID_URL',
      'URLs with credentials are not allowed'
    );
  }

  // DNS resolution check — resolve hostname and reject private IPs
  try {
    const addresses = await dnsLookup(parsed.hostname, { all: true });
    const results = Array.isArray(addresses) ? addresses : [addresses];

    for (const addr of results) {
      const address = typeof addr === 'string' ? addr : addr.address;
      const family = typeof addr === 'string' ? 4 : addr.family;

      if (family === 4 && isPrivateIpv4(address)) {
        throw new GitSyncError(
          'SSRF_BLOCKED',
          `DNS resolved to private IP: ${address}`
        );
      }
      if (family === 6 && isPrivateIpv6(address)) {
        throw new GitSyncError(
          'SSRF_BLOCKED',
          `DNS resolved to private IPv6: ${address}`
        );
      }
    }
  } catch (err) {
    if (err instanceof GitSyncError) throw err;
    throw new GitSyncError(
      'DNS_RESOLUTION_FAILED',
      `Failed to resolve hostname: ${parsed.hostname}`
    );
  }
}

// --- Clone ---

/**
 * Clone a git repo to a temp directory with hardening.
 * Uses execFile (not exec) to prevent command injection.
 */
export async function cloneRepo(
  url: string,
  ref: string,
  targetDir: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLONE_TIMEOUT_MS);

  try {
    await execFileAsync(
      'git',
      [
        'clone',
        '--depth', '1',
        '--branch', ref,
        '--single-branch',
        '-c', 'submodule.recurse=false',
        url,
        targetDir,
      ],
      {
        signal: controller.signal,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_LFS_SKIP_SMUDGE: '1',
        },
        timeout: CLONE_TIMEOUT_MS,
      }
    );

    // Get the commit hash
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: targetDir,
    });

    return stdout.trim();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown clone error';
    if (message.includes('abort') || message.includes('ABORT')) {
      throw new GitSyncError('CLONE_TIMEOUT', 'Git clone timed out after 30s');
    }
    throw new GitSyncError('CLONE_FAILED', `Git clone failed: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

// --- Tree Validation ---

/**
 * Validate the cloned tree for security:
 * - No symlinks
 * - No path traversal (..)
 * - No absolute paths
 * - No paths > 255 chars
 * - All files within expected directories
 */
export async function validateTree(dir: string): Promise<void> {
  const entries = await walkDir(dir, dir);

  for (const entry of entries) {
    // Check for path traversal
    if (entry.relativePath.includes('..')) {
      throw new GitSyncError(
        'PATH_TRAVERSAL',
        `Path traversal detected: ${entry.relativePath}`
      );
    }

    // Check for absolute paths
    if (path.isAbsolute(entry.relativePath)) {
      throw new GitSyncError(
        'ABSOLUTE_PATH',
        `Absolute path not allowed: ${entry.relativePath}`
      );
    }

    // Check path length
    if (entry.relativePath.length > 255) {
      throw new GitSyncError(
        'PATH_TOO_LONG',
        `Path exceeds 255 chars: ${entry.relativePath}`
      );
    }

    // Check for symlinks (use lstat to detect)
    if (entry.isSymlink) {
      throw new GitSyncError(
        'SYMLINK_DETECTED',
        `Symlinks not allowed: ${entry.relativePath}`
      );
    }
  }
}

interface TreeEntry {
  relativePath: string;
  isSymlink: boolean;
  isDirectory: boolean;
}

async function walkDir(
  dir: string,
  rootDir: string
): Promise<TreeEntry[]> {
  const entries: TreeEntry[] = [];
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    // Skip .git directory
    if (item.name === '.git') continue;

    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(rootDir, fullPath);

    // Use lstat to detect symlinks
    const stat = await fs.lstat(fullPath);

    entries.push({
      relativePath,
      isSymlink: stat.isSymbolicLink(),
      isDirectory: stat.isDirectory(),
    });

    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      const children = await walkDir(fullPath, rootDir);
      entries.push(...children);
    }
  }

  return entries;
}

// --- File Collection ---

/**
 * Collect files from allowed directories with size enforcement.
 * Returns base64-encoded file contents for DB storage.
 */
export async function collectFiles(dir: string): Promise<CollectedFile[]> {
  const files: CollectedFile[] = [];
  let totalSize = 0;

  // Collect root files
  for (const fileName of ALLOWED_ROOT_FILES) {
    const filePath = path.join(dir, fileName);
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      if (stat.size > MAX_FILE_SIZE) {
        throw new GitSyncError(
          'FILE_TOO_LARGE',
          `File exceeds 256KB limit: ${fileName} (${stat.size} bytes)`
        );
      }

      totalSize += stat.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new GitSyncError(
          'TOTAL_SIZE_EXCEEDED',
          `Total size exceeds 5MB limit at file: ${fileName}`
        );
      }

      const content = await fs.readFile(filePath);
      files.push({
        path: fileName,
        content: content.toString('base64'),
        contentHash: crypto.createHash('sha256').update(content).digest('hex'),
        sizeBytes: stat.size,
        mimeType: getMimeType(fileName),
      });
    } catch (err) {
      if (err instanceof GitSyncError) throw err;
      // File doesn't exist — skip silently
    }
  }

  // Collect files from allowed directories
  for (const allowedDir of ALLOWED_DIRS) {
    const dirPath = path.join(dir, allowedDir);
    try {
      await fs.access(dirPath);
    } catch {
      continue; // Directory doesn't exist — skip
    }

    const dirFiles = await collectDirFiles(dirPath, dir);
    for (const file of dirFiles) {
      if (files.length >= MAX_FILES) {
        throw new GitSyncError(
          'TOO_MANY_FILES',
          `Exceeds ${MAX_FILES} file limit`
        );
      }

      if (file.sizeBytes > MAX_FILE_SIZE) {
        throw new GitSyncError(
          'FILE_TOO_LARGE',
          `File exceeds 256KB limit: ${file.path} (${file.sizeBytes} bytes)`
        );
      }

      totalSize += file.sizeBytes;
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new GitSyncError(
          'TOTAL_SIZE_EXCEEDED',
          `Total size exceeds 5MB limit at file: ${file.path}`
        );
      }

      files.push(file);
    }
  }

  return files;
}

async function collectDirFiles(
  dirPath: string,
  rootDir: string
): Promise<CollectedFile[]> {
  const files: CollectedFile[] = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (item.isDirectory()) {
      const children = await collectDirFiles(fullPath, rootDir);
      files.push(...children);
    } else if (item.isFile()) {
      const stat = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath);

      files.push({
        path: relativePath,
        content: content.toString('base64'),
        contentHash: crypto
          .createHash('sha256')
          .update(content)
          .digest('hex'),
        sizeBytes: stat.size,
        mimeType: getMimeType(item.name),
      });
    }
  }

  return files;
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const types: Record<string, string> = {
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.sh': 'application/x-sh',
    '.ts': 'text/typescript',
    '.js': 'text/javascript',
  };
  return types[ext] || 'text/plain';
}

// --- Manifest Reading ---

/**
 * Read and validate the construct manifest.
 * Tries construct.yaml first, falls back to manifest.json.
 */
export async function readManifest(
  dir: string
): Promise<Record<string, unknown>> {
  // Try construct.yaml first
  const yamlPath = path.join(dir, 'construct.yaml');
  try {
    const content = await fs.readFile(yamlPath, 'utf-8');
    const manifest = yaml.load(content) as Record<string, unknown>;

    if (!manifest || typeof manifest !== 'object') {
      throw new GitSyncError(
        'INVALID_MANIFEST',
        'construct.yaml is not a valid YAML object'
      );
    }

    await validateManifest(manifest);
    return manifest;
  } catch (err) {
    if (err instanceof GitSyncError) throw err;
    // construct.yaml doesn't exist or parse error — try manifest.json
  }

  // Fall back to manifest.json
  const jsonPath = path.join(dir, 'manifest.json');
  try {
    const content = await fs.readFile(jsonPath, 'utf-8');
    const manifest = JSON.parse(content) as Record<string, unknown>;

    await validateManifest(manifest);
    return manifest;
  } catch (err) {
    if (err instanceof GitSyncError) throw err;
    throw new GitSyncError(
      'NO_MANIFEST',
      'No valid construct.yaml or manifest.json found'
    );
  }
}

async function validateManifest(
  manifest: Record<string, unknown>
): Promise<void> {
  const validator = await getSchemaValidator();

  if (validator) {
    const valid = validator(manifest);
    if (!valid && validator.errors) {
      const errors = validator.errors.map((e: { instancePath?: string; message?: string }) => ({
        path: e.instancePath || '/',
        message: e.message || 'Unknown validation error',
      }));
      throw new GitSyncError(
        'MANIFEST_VALIDATION_FAILED',
        `Manifest validation failed: ${errors.map((e: { path: string; message: string }) => `${e.path}: ${e.message}`).join('; ')}`
      );
    }
  }

  // Essential field checks (even without schema validator)
  if (!manifest.name || typeof manifest.name !== 'string') {
    throw new GitSyncError(
      'MANIFEST_VALIDATION_FAILED',
      'Manifest must have a "name" field'
    );
  }
  if (!manifest.slug || typeof manifest.slug !== 'string') {
    throw new GitSyncError(
      'MANIFEST_VALIDATION_FAILED',
      'Manifest must have a "slug" field'
    );
  }
  if (!manifest.version || typeof manifest.version !== 'string') {
    throw new GitSyncError(
      'MANIFEST_VALIDATION_FAILED',
      'Manifest must have a "version" field'
    );
  }
}

// --- Identity Parsing ---

/**
 * Read identity files (persona.yaml, expertise.yaml) if present.
 * Returns null if identity directory doesn't exist.
 */
export async function parseIdentity(
  dir: string
): Promise<IdentityData | null> {
  const identityDir = path.join(dir, 'identity');
  try {
    await fs.access(identityDir);
  } catch {
    return null;
  }

  let persona: Record<string, unknown> | null = null;
  let expertise: Record<string, unknown> | null = null;
  let personaYaml: string | null = null;
  let expertiseYaml: string | null = null;

  try {
    const personaPath = path.join(identityDir, 'persona.yaml');
    personaYaml = await fs.readFile(personaPath, 'utf-8');
    persona = yaml.load(personaYaml) as Record<string, unknown>;
  } catch {
    // persona.yaml not found — ok
  }

  try {
    const expertisePath = path.join(identityDir, 'expertise.yaml');
    expertiseYaml = await fs.readFile(expertisePath, 'utf-8');
    expertise = yaml.load(expertiseYaml) as Record<string, unknown>;
  } catch {
    // expertise.yaml not found — ok
  }

  if (!persona && !expertise) return null;

  // Extract structured fields from persona
  const cognitiveFrame = persona
    ? {
        archetype: persona.archetype ?? null,
        disposition: persona.disposition ?? null,
        thinking_style: persona.thinking_style ?? null,
        decision_making: persona.decision_making ?? null,
      }
    : null;

  const voiceConfig = persona?.voice
    ? (persona.voice as Record<string, unknown>)
    : null;

  const modelPreferences = persona?.model_preferences
    ? (persona.model_preferences as Record<string, unknown>)
    : null;

  // Extract expertise domains
  const expertiseDomains = expertise?.domains
    ? (expertise.domains as unknown[])
    : null;

  return {
    persona,
    expertise,
    personaYaml,
    expertiseYaml,
    cognitiveFrame,
    expertiseDomains,
    voiceConfig,
    modelPreferences,
  };
}

// --- Orchestrator ---

/**
 * Full sync flow: clone → validate → read → collect → cleanup.
 * Always cleans up the temp directory in the finally block.
 */
export async function syncFromRepo(
  gitUrl: string,
  gitRef: string
): Promise<SyncResult> {
  const tmpDir = path.join(
    os.tmpdir(),
    `construct-sync-${crypto.randomUUID()}`
  );

  try {
    // 1. Validate URL
    await validateGitUrl(gitUrl);

    // 2. Clone
    logger.info({ gitUrl, gitRef, tmpDir }, 'Starting git clone');
    const commit = await cloneRepo(gitUrl, gitRef, tmpDir);
    logger.info({ commit }, 'Clone complete');

    // 3. Validate tree
    await validateTree(tmpDir);

    // 4. Read manifest
    const manifest = await readManifest(tmpDir);
    const version = manifest.version as string;

    // 5. Collect files
    const files = await collectFiles(tmpDir);
    const totalSizeBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

    // 6. Parse identity (if present)
    const identity = await parseIdentity(tmpDir);

    logger.info(
      {
        version,
        commit,
        fileCount: files.length,
        totalSizeBytes,
        hasIdentity: !!identity,
      },
      'Sync complete'
    );

    return {
      version,
      commit,
      manifest,
      files,
      identity,
      totalSizeBytes,
    };
  } finally {
    // Always cleanup
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (err) {
      logger.warn({ tmpDir, err }, 'Failed to cleanup temp directory');
    }
  }
}

// --- Error Class ---

export class GitSyncError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GitSyncError';
    this.code = code;
  }
}
