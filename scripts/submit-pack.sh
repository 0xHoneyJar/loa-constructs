#!/bin/bash
# Submit a pack to the Loa Constructs Registry
# Usage: ./scripts/submit-pack.sh <pack-directory>
#
# Requires:
#   - LOA_CONSTRUCTS_API_KEY environment variable
#   - jq for JSON processing

set -e

PACK_DIR="${1:-.}"
API_URL="${LOA_CONSTRUCTS_API_URL:-https://loa-constructs-api.fly.dev/v1}"

# Check for API key
if [ -z "$LOA_CONSTRUCTS_API_KEY" ]; then
  echo "Error: LOA_CONSTRUCTS_API_KEY not set"
  echo "Get your API key from: https://constructs.network/dashboard/api-keys"
  exit 1
fi

# Check for required tools
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required. Install with: brew install jq"
  exit 1
fi

# Check manifest exists
MANIFEST="$PACK_DIR/manifest.json"
if [ ! -f "$MANIFEST" ]; then
  echo "Error: manifest.json not found in $PACK_DIR"
  exit 1
fi

# Parse manifest
PACK_NAME=$(jq -r '.name' "$MANIFEST")
PACK_SLUG=$(jq -r '.slug' "$MANIFEST")
PACK_VERSION=$(jq -r '.version' "$MANIFEST")
PACK_DESCRIPTION=$(jq -r '.description' "$MANIFEST")

echo "=== Submitting Pack ==="
echo "Name: $PACK_NAME"
echo "Slug: $PACK_SLUG"
echo "Version: $PACK_VERSION"
echo ""

# Step 1: Create pack (or check if exists)
echo "Step 1: Creating pack entry..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/packs" \
  -H "Authorization: $LOA_CONSTRUCTS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$PACK_NAME\",
    \"slug\": \"$PACK_SLUG\",
    \"description\": \"$PACK_DESCRIPTION\"
  }")

if echo "$CREATE_RESPONSE" | jq -e '.error.code == "CONFLICT"' > /dev/null 2>&1; then
  echo "Pack already exists, continuing..."
elif echo "$CREATE_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "Error creating pack: $(echo "$CREATE_RESPONSE" | jq -r '.error.message')"
  exit 1
else
  echo "Pack created successfully"
fi

# Step 2: Collect files
echo ""
echo "Step 2: Collecting files..."
FILES_JSON="[]"

# Find all files in pack directory (excluding hidden files and directories)
while IFS= read -r -d '' file; do
  REL_PATH="${file#$PACK_DIR/}"
  CONTENT=$(base64 < "$file")

  # Determine MIME type
  case "$REL_PATH" in
    *.md) MIME="text/markdown" ;;
    *.yaml|*.yml) MIME="text/yaml" ;;
    *.json) MIME="application/json" ;;
    *.sh) MIME="text/x-shellscript" ;;
    *.ts) MIME="text/typescript" ;;
    *.tsx) MIME="text/typescript" ;;
    *) MIME="text/plain" ;;
  esac

  FILES_JSON=$(echo "$FILES_JSON" | jq --arg path "$REL_PATH" --arg content "$CONTENT" --arg mime "$MIME" \
    '. + [{"path": $path, "content": $content, "mime_type": $mime}]')

  echo "  + $REL_PATH"
done < <(find "$PACK_DIR" -type f ! -path '*/\.*' -print0)

FILE_COUNT=$(echo "$FILES_JSON" | jq 'length')
echo "Found $FILE_COUNT files"

# Step 3: Upload version
echo ""
echo "Step 3: Uploading version $PACK_VERSION..."

MANIFEST_JSON=$(jq '.' "$MANIFEST")
VERSION_PAYLOAD=$(jq -n \
  --arg version "$PACK_VERSION" \
  --argjson manifest "$MANIFEST_JSON" \
  --argjson files "$FILES_JSON" \
  '{
    "version": $version,
    "manifest": $manifest,
    "files": $files,
    "changelog": "Initial release"
  }')

VERSION_RESPONSE=$(curl -s -X POST "$API_URL/packs/$PACK_SLUG/versions" \
  -H "Authorization: $LOA_CONSTRUCTS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$VERSION_PAYLOAD")

if echo "$VERSION_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "Error uploading version: $(echo "$VERSION_RESPONSE" | jq -r '.error.message')"
  exit 1
fi

echo "Version uploaded successfully"
echo "  ID: $(echo "$VERSION_RESPONSE" | jq -r '.data.id')"
echo "  Files: $(echo "$VERSION_RESPONSE" | jq -r '.data.file_count')"

# Step 4: Submit for review
echo ""
echo "Step 4: Submitting for review..."

SUBMIT_RESPONSE=$(curl -s -X POST "$API_URL/packs/$PACK_SLUG/submit" \
  -H "Authorization: $LOA_CONSTRUCTS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"submission_notes": "Initial pack submission"}')

if echo "$SUBMIT_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "Error submitting: $(echo "$SUBMIT_RESPONSE" | jq -r '.error.message')"
  exit 1
fi

echo ""
echo "=== Success ==="
echo "Pack submitted for review!"
echo "Submission ID: $(echo "$SUBMIT_RESPONSE" | jq -r '.data.submission_id')"
echo ""
echo "Next: Approve via admin dashboard or API"
