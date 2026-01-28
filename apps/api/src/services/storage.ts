/**
 * R2 Storage Service
 * @see sprint.md T4.1: R2 Storage Setup
 * @see sdd.md §1.6 External Integrations - Cloudflare R2
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { Errors } from '../lib/errors.js';

// --- Constants ---

/**
 * Maximum file size (10MB)
 * @see sprint.md Risks & Mitigation: "Large file uploads - size limits (10MB)"
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Default signed URL expiration (1 hour)
 */
const DEFAULT_URL_EXPIRES_IN = 3600;

/**
 * Allowed MIME types for skill files
 */
export const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/yaml',
  'application/json',
  'application/x-yaml',
  'text/x-typescript',
  'text/javascript',
] as const;

// --- S3 Client ---

let s3Client: S3Client | null = null;

/**
 * Get S3 client instance (lazy initialization)
 * Configured for Cloudflare R2 compatibility
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 storage is not configured');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

/**
 * Check if R2 storage is configured
 */
export function isStorageConfigured(): boolean {
  return Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
}

// --- Storage Operations ---

/**
 * Upload a file to R2 storage
 * @param key - Storage key (path)
 * @param buffer - File contents
 * @param contentType - MIME type
 * @returns Storage key for retrieval
 */
export async function uploadFile(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw Errors.BadRequest(`File exceeds maximum size of ${MAX_FILE_SIZE} bytes`);
  }

  let client: S3Client;
  try {
    client = getS3Client();
  } catch (error) {
    logger.error({ error }, 'R2 storage client initialization failed');
    throw Errors.StorageUnavailable();
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    logger.info({ key, size: buffer.length, contentType }, 'File uploaded to R2');
    return key;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    logger.error({ key, error: errorMessage, errorName }, 'Failed to upload file to R2');

    // Provide actionable error details
    throw Errors.StorageError('upload', {
      key,
      reason: errorMessage,
      hint: 'Check R2 bucket configuration and credentials',
    });
  }
}

/**
 * Download a file from R2 storage
 * @param key - Storage key
 * @returns File contents as Buffer
 */
export async function downloadFile(key: string): Promise<Buffer> {
  let client: S3Client;
  try {
    client = getS3Client();
  } catch (error) {
    logger.error({ error }, 'R2 storage client initialization failed');
    throw Errors.StorageUnavailable();
  }

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
      })
    );

    if (!response.Body) {
      throw Errors.StorageError('download', { key, reason: 'Empty response body' });
    }

    // Convert readable stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    logger.debug({ key, size: buffer.length }, 'File downloaded from R2');
    return buffer;
  } catch (error) {
    // Re-throw if already an AppError
    if (error && typeof error === 'object' && 'code' in error && error.code === 'STORAGE_ERROR') {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ key, error: errorMessage }, 'Failed to download file from R2');
    throw Errors.StorageError('download', { key, reason: errorMessage });
  }
}

/**
 * Delete a file from R2 storage
 * @param key - Storage key
 */
export async function deleteFile(key: string): Promise<void> {
  let client: S3Client;
  try {
    client = getS3Client();
  } catch (error) {
    logger.error({ error }, 'R2 storage client initialization failed');
    throw Errors.StorageUnavailable();
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
      })
    );

    logger.info({ key }, 'File deleted from R2');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ key, error: errorMessage }, 'Failed to delete file from R2');
    throw Errors.StorageError('delete', { key, reason: errorMessage });
  }
}

/**
 * Generate a signed URL for direct file access
 * @param key - Storage key
 * @param expiresIn - URL expiration in seconds (default 1 hour)
 * @returns Signed URL
 */
export async function getSignedDownloadUrl(key: string, expiresIn = DEFAULT_URL_EXPIRES_IN): Promise<string> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  logger.debug({ key, expiresIn }, 'Generated signed URL');
  return url;
}

/**
 * Generate storage key for skill files
 * Format: skills/{skillSlug}/{version}/{path}
 */
export function generateStorageKey(skillSlug: string, version: string, filePath: string): string {
  // Sanitize path components
  const safePath = filePath.replace(/\.\./g, '').replace(/^\//, '');
  return `skills/${skillSlug}/${version}/${safePath}`;
}

/**
 * Validate MIME type
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number]);
}

/**
 * Verify R2 storage is properly configured and accessible
 * Used for health checks and pre-flight validation
 */
export async function verifyStorageConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  if (!isStorageConfigured()) {
    return { configured: false, connected: false, error: 'R2 credentials not configured' };
  }

  try {
    const client = getS3Client();
    // Try a lightweight operation to verify connectivity
    await client.send(
      new HeadObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: 'skills/.storage-health-check',
      })
    ).catch((err) => {
      // NoSuchKey is expected and means we can connect
      if (err.name === 'NoSuchKey' || err.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) return;
      throw err;
    });

    return { configured: true, connected: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ error: errorMessage }, 'R2 storage connectivity check failed');
    return { configured: true, connected: false, error: errorMessage };
  }
}
