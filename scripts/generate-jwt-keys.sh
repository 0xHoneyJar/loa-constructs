#!/usr/bin/env bash
# =============================================================================
# Generate RSA Key Pair for JWT RS256 Signing
# =============================================================================
# Creates an RSA key pair and outputs base64-encoded versions for env vars.
#
# Usage:
#   ./scripts/generate-jwt-keys.sh [key_size] [key_id] [output_dir]
#
# Arguments:
#   key_size   - RSA key size in bits (default: 2048)
#   key_id     - Key identifier for JWT kid header (default: key-YYYY-MM)
#   output_dir - Directory for output files (default: current directory)
#
# Example:
#   ./scripts/generate-jwt-keys.sh 2048 key-2026-02 ./secrets
#
# @see sdd-license-jwt-rs256.md §8.1 Generation Utility
# @see prd-license-jwt-rs256.md FR-1: RSA Key Pair Management
# =============================================================================

set -euo pipefail

# Defaults
KEY_SIZE="${1:-2048}"
KEY_ID="${2:-key-$(date +%Y-%m)}"
OUTPUT_DIR="${3:-.}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  JWT RS256 Key Pair Generator"
echo "========================================"
echo ""
echo "Key size:   ${KEY_SIZE} bits"
echo "Key ID:     ${KEY_ID}"
echo "Output dir: ${OUTPUT_DIR}"
echo ""

# Check for OpenSSL
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: OpenSSL is required but not installed.${NC}"
    exit 1
fi

# Create output directory if needed
mkdir -p "${OUTPUT_DIR}"

PRIVATE_KEY_FILE="${OUTPUT_DIR}/jwt-private.pem"
PUBLIC_KEY_FILE="${OUTPUT_DIR}/jwt-public.pem"

# Generate private key
echo "Generating ${KEY_SIZE}-bit RSA private key..."
openssl genrsa -out "${PRIVATE_KEY_FILE}" "${KEY_SIZE}" 2>/dev/null

if [[ ! -f "${PRIVATE_KEY_FILE}" ]]; then
    echo -e "${RED}Error: Failed to generate private key.${NC}"
    exit 1
fi

# Set restrictive permissions on private key
chmod 600 "${PRIVATE_KEY_FILE}"

# Extract public key
echo "Extracting public key..."
openssl rsa -in "${PRIVATE_KEY_FILE}" -pubout -out "${PUBLIC_KEY_FILE}" 2>/dev/null

if [[ ! -f "${PUBLIC_KEY_FILE}" ]]; then
    echo -e "${RED}Error: Failed to extract public key.${NC}"
    exit 1
fi

# Create base64 versions for environment variables
# Use -w0 on Linux, no flag needed on macOS (base64 behavior differs)
if base64 --help 2>&1 | grep -q '\-w'; then
    # GNU base64 (Linux)
    PRIVATE_B64=$(base64 -w0 "${PRIVATE_KEY_FILE}")
    PUBLIC_B64=$(base64 -w0 "${PUBLIC_KEY_FILE}")
else
    # BSD base64 (macOS)
    PRIVATE_B64=$(base64 "${PRIVATE_KEY_FILE}" | tr -d '\n')
    PUBLIC_B64=$(base64 "${PUBLIC_KEY_FILE}" | tr -d '\n')
fi

echo ""
echo -e "${GREEN}Keys generated successfully!${NC}"
echo ""
echo "Files created:"
echo "  - ${PRIVATE_KEY_FILE} (KEEP SECRET!)"
echo "  - ${PUBLIC_KEY_FILE}"
echo ""
echo "========================================"
echo "  Add to your .env file:"
echo "========================================"
echo ""
echo "JWT_PRIVATE_KEY=${PRIVATE_B64}"
echo ""
echo "JWT_PUBLIC_KEY=${PUBLIC_B64}"
echo ""
echo "JWT_KEY_ID=${KEY_ID}"
echo ""
echo "========================================"
echo -e "${YELLOW}SECURITY WARNINGS:${NC}"
echo "========================================"
echo ""
echo "1. DELETE the .pem files after copying values to .env"
echo "2. NEVER commit private keys to version control"
echo "3. Store production keys in secure secrets manager"
echo "4. Rotate keys periodically (recommended: yearly)"
echo ""
