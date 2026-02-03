/**
 * Generate RSA Key Pair for JWT Signing
 *
 * Generates a 2048-bit RSA key pair and outputs base64-encoded values
 * suitable for copying to .env file.
 *
 * Usage: pnpm keys:generate
 *
 * @see sdd-local-dev-dx.md §3.1 generate-jwt-keys.ts
 * @see prd-local-dev-dx.md FR-1: RSA Key Pair Management
 */

import { generateKeyPairSync } from 'crypto';

function main() {
  console.log('Generating RSA-2048 key pair...\n');

  // Generate 2048-bit RSA key pair
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Generate key ID with date prefix
  const keyId = `key-${new Date().toISOString().slice(0, 7)}`;

  // Base64 encode for .env storage
  const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
  const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

  // Validate keys are properly generated
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error('ERROR: Invalid private key generated');
    process.exit(1);
  }
  if (!publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
    console.error('ERROR: Invalid public key generated');
    process.exit(1);
  }

  // Output for .env
  console.log('# Add these to your .env file:');
  console.log('#');
  console.log(`JWT_PRIVATE_KEY=${privateKeyBase64}`);
  console.log(`JWT_PUBLIC_KEY=${publicKeyBase64}`);
  console.log(`JWT_KEY_ID=${keyId}`);
  console.log('');
  console.log('# Key details:');
  console.log('#   Algorithm: RS256 (RSA-SHA256)');
  console.log('#   Key Size: 2048 bits');
  console.log(`#   Key ID: ${keyId}`);
  console.log('#   Private Key Format: PKCS#8 PEM (base64)');
  console.log('#   Public Key Format: SPKI PEM (base64)');
}

main();
