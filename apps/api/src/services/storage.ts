/**
 * R2 Storage Service
 * @see sprint.md T4.1: R2 Storage Setup
 * @see sdd.md §1.6 External Integrations - Cloudflare R2
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

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
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE} bytes`);
  }

  const client = getS3Client();

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
    logger.error({ key, error }, 'Failed to upload file to R2');
    throw error;
  }
}

/**
 * Download a file from R2 storage
 * @param key - Storage key
 * @returns File contents as Buffer
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const client = getS3Client();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error('Empty response body');
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
    logger.error({ key, error }, 'Failed to download file from R2');
    throw error;
  }
}

/**
 * Delete a file from R2 storage
 * @param key - Storage key
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
      })
    );

    logger.info({ key }, 'File deleted from R2');
  } catch (error) {
    logger.error({ key, error }, 'Failed to delete file from R2');
    throw error;
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
