/**
 * Construct Manifest Validator
 * JSON Schema validation for construct manifests
 * @see sdd-constructs-api.md §6.2 Manifest Validator
 */

import AjvModule, { type ErrorObject } from 'ajv';
import addFormatsModule from 'ajv-formats';

// Handle ESM/CJS interop
const Ajv = AjvModule.default || AjvModule;
const addFormats = addFormatsModule.default || addFormatsModule;
import { Errors } from './errors.js';

// Import JSON schema - using require for JSON import compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const constructManifestSchema = require('../schemas/construct-manifest.json');

// --- Types ---

export interface McpToolDefinition {
  install?: string;
  required?: boolean;
  purpose: string;
  check: string;
  docs_url?: string;
}

export interface McpDependencyDefinition {
  required?: boolean;
  required_scopes?: string[];
  reason: string;
  fallback?: string;
}

export interface ConstructManifest {
  name?: string;
  version?: string;
  type?: 'skill' | 'pack' | 'bundle';
  description?: string;
  author?: string;
  license?: 'MIT' | 'Apache-2.0' | 'proprietary' | 'UNLICENSED';
  skills?: Array<{
    name: string;
    version?: string;
    required?: boolean;
  }>;
  commands?: Array<{
    name: string;
    skill?: string;
    description?: string;
  }>;
  dependencies?: {
    skills?: string[];
    tools?: string[];
  };
  cultural_contexts?: {
    required?: string[];
    optional?: string[];
  };
  directories?: string[];
  hooks?: {
    post_install?: string;
    post_update?: string;
  };
  unix?: {
    inputs?: unknown[];
    outputs?: unknown[];
    composes_with?: string[];
  };
  tier_required?: 'free' | 'pro' | 'team' | 'enterprise';
  claude_instructions?: string;
  schema_version?: number;
  tools?: Record<string, McpToolDefinition>;
  mcp_dependencies?: Record<string, McpDependencyDefinition>;
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

// --- Validator Setup ---

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateManifestFn = ajv.compile(constructManifestSchema);

// --- Validation Functions ---

/**
 * Validate construct manifest against JSON Schema
 * @returns Validation result with errors array (never throws)
 */
export function validateConstructManifest(manifest: unknown): ManifestValidationResult {
  const valid = validateManifestFn(manifest);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validateManifestFn.errors || []).map((err: ErrorObject) => ({
    path: err.instancePath || '/',
    message: err.message || 'Unknown validation error',
  }));

  return { valid: false, errors };
}

/**
 * Strict validation - throws AppError on invalid manifest
 * @throws AppError with code INVALID_MANIFEST
 */
export function assertValidManifest(manifest: unknown): asserts manifest is ConstructManifest {
  const result = validateConstructManifest(manifest);
  if (!result.valid) {
    throw Errors.InvalidManifest(result.errors);
  }
}

/**
 * Check if manifest has commands
 */
export function manifestHasCommands(manifest: ConstructManifest | null | undefined): boolean {
  return Array.isArray(manifest?.commands) && manifest.commands.length > 0;
}

/**
 * Extract command names from manifest
 */
export function extractCommandNames(manifest: ConstructManifest | null | undefined): string[] {
  if (!manifest?.commands) return [];
  return manifest.commands.map((cmd) => cmd.name).filter(Boolean);
}
