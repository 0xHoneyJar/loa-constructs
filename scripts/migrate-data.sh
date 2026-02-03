#!/bin/bash
#
# Data Migration Script
# @see sdd-infrastructure-migration.md §4.2 Data Migration Commands
# @see sprint-infrastructure-migration.md T22.6
#
# Migrates data from Neon PostgreSQL to Supabase PostgreSQL.
# Supports both full migration and incremental sync modes.
#
# Usage:
#   ./scripts/migrate-data.sh --source "$NEON_URL" --target "$SUPABASE_URL" --mode full
#   ./scripts/migrate-data.sh --source "$NEON_URL" --target "$SUPABASE_URL" --mode incremental --since "2024-01-01"
#
# Prerequisites:
#   - pg_dump and pg_restore installed
#   - Both database URLs accessible
#   - Target database has schema already applied (pnpm db:migrate)

set -euo pipefail

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Default Values ---
MODE="full"
SINCE=""
BACKUP_DIR="./migration-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# --- Functions ---

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

usage() {
  cat << EOF
Usage: $0 --source <URL> --target <URL> --mode <full|incremental> [--since <date>]

Options:
  --source    Source database URL (Neon)
  --target    Target database URL (Supabase)
  --mode      Migration mode: 'full' or 'incremental'
  --since     For incremental mode: sync records updated after this date (YYYY-MM-DD)
  --help      Show this help message

Examples:
  # Full migration
  $0 --source "\$NEON_URL" --target "\$SUPABASE_URL" --mode full

  # Incremental sync since a specific date
  $0 --source "\$NEON_URL" --target "\$SUPABASE_URL" --mode incremental --since "2024-01-15"
EOF
  exit 1
}

check_prerequisites() {
  log_info "Checking prerequisites..."

  if ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump is required but not installed"
    exit 1
  fi

  if ! command -v pg_restore &> /dev/null; then
    log_error "pg_restore is required but not installed"
    exit 1
  fi

  if ! command -v psql &> /dev/null; then
    log_error "psql is required but not installed"
    exit 1
  fi

  log_success "Prerequisites satisfied"
}

test_connections() {
  log_info "Testing database connections..."

  if ! psql "$SOURCE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    log_error "Cannot connect to source database"
    exit 1
  fi
  log_success "Source database connection OK"

  if ! psql "$TARGET_URL" -c "SELECT 1" > /dev/null 2>&1; then
    log_error "Cannot connect to target database"
    exit 1
  fi
  log_success "Target database connection OK"
}

create_backup() {
  log_info "Creating backup of source database..."
  mkdir -p "$BACKUP_DIR"

  local backup_file="$BACKUP_DIR/backup-$TIMESTAMP.dump"

  pg_dump "$SOURCE_URL" \
    --format=custom \
    --no-owner \
    --no-acl \
    --verbose \
    --file="$backup_file" \
    2>&1 | while read -r line; do echo "  $line"; done

  log_success "Backup created: $backup_file"
  echo "$backup_file"
}

migrate_full() {
  log_info "Starting FULL migration..."

  # Create backup first
  local backup_file
  backup_file=$(create_backup)

  # Disable foreign key checks and truncate target tables
  log_info "Preparing target database..."
  psql "$TARGET_URL" << 'EOF'
    SET session_replication_role = replica;

    -- Truncate tables in dependency order (children first)
    TRUNCATE TABLE pack_installations CASCADE;
    TRUNCATE TABLE pack_files CASCADE;
    TRUNCATE TABLE pack_versions CASCADE;
    TRUNCATE TABLE construct_categories CASCADE;
    TRUNCATE TABLE skill_versions CASCADE;
    TRUNCATE TABLE skill_collaborators CASCADE;
    TRUNCATE TABLE team_members CASCADE;
    TRUNCATE TABLE sessions CASCADE;
    TRUNCATE TABLE audit_events CASCADE;
    TRUNCATE TABLE subscriptions CASCADE;
    TRUNCATE TABLE packs CASCADE;
    TRUNCATE TABLE skills CASCADE;
    TRUNCATE TABLE teams CASCADE;
    TRUNCATE TABLE categories CASCADE;
    TRUNCATE TABLE users CASCADE;

    SET session_replication_role = DEFAULT;
EOF
  log_success "Target tables truncated"

  # Restore data
  log_info "Restoring data to target database..."
  pg_restore \
    --dbname="$TARGET_URL" \
    --no-owner \
    --no-acl \
    --data-only \
    --disable-triggers \
    --verbose \
    "$backup_file" \
    2>&1 | while read -r line; do echo "  $line"; done || true

  log_success "Data restored to target database"

  # Re-enable triggers and verify
  log_info "Re-enabling triggers..."
  psql "$TARGET_URL" -c "SET session_replication_role = DEFAULT;" > /dev/null

  log_success "Full migration complete"
}

migrate_incremental() {
  if [ -z "$SINCE" ]; then
    log_error "Incremental mode requires --since parameter"
    exit 1
  fi

  log_info "Starting INCREMENTAL migration (since $SINCE)..."

  # Tables with updated_at column for incremental sync
  local tables=("users" "teams" "skills" "packs" "subscriptions")

  for table in "${tables[@]}"; do
    log_info "Syncing $table..."

    # Export records updated since the specified date
    local temp_file="/tmp/migrate-$table-$TIMESTAMP.csv"

    psql "$SOURCE_URL" -c "\\COPY (SELECT * FROM $table WHERE updated_at >= '$SINCE') TO '$temp_file' WITH CSV HEADER"

    # Count records
    local count
    count=$(wc -l < "$temp_file")
    count=$((count - 1)) # Subtract header

    if [ "$count" -gt 0 ]; then
      # Upsert into target using temporary table
      psql "$TARGET_URL" << EOF
        CREATE TEMP TABLE temp_import (LIKE $table INCLUDING ALL);
        \\COPY temp_import FROM '$temp_file' WITH CSV HEADER;

        INSERT INTO $table
        SELECT * FROM temp_import
        ON CONFLICT (id) DO UPDATE SET
          updated_at = EXCLUDED.updated_at;

        DROP TABLE temp_import;
EOF
      log_success "Synced $count records from $table"
    else
      log_info "No new records in $table"
    fi

    rm -f "$temp_file"
  done

  log_success "Incremental migration complete"
}

verify_migration() {
  log_info "Running verification..."

  # Get counts from both databases
  local source_users target_users
  source_users=$(psql "$SOURCE_URL" -t -c "SELECT COUNT(*) FROM users")
  target_users=$(psql "$TARGET_URL" -t -c "SELECT COUNT(*) FROM users")

  local source_packs target_packs
  source_packs=$(psql "$SOURCE_URL" -t -c "SELECT COUNT(*) FROM packs")
  target_packs=$(psql "$TARGET_URL" -t -c "SELECT COUNT(*) FROM packs")

  local source_subs target_subs
  source_subs=$(psql "$SOURCE_URL" -t -c "SELECT COUNT(*) FROM subscriptions")
  target_subs=$(psql "$TARGET_URL" -t -c "SELECT COUNT(*) FROM subscriptions")

  echo ""
  echo "============================================="
  echo "Migration Verification Summary"
  echo "============================================="
  printf "%-20s %10s %10s\n" "Table" "Source" "Target"
  echo "---------------------------------------------"
  printf "%-20s %10s %10s\n" "users" "$source_users" "$target_users"
  printf "%-20s %10s %10s\n" "packs" "$source_packs" "$target_packs"
  printf "%-20s %10s %10s\n" "subscriptions" "$source_subs" "$target_subs"
  echo "============================================="
  echo ""

  # Check for mismatches
  if [ "$source_users" != "$target_users" ] || [ "$source_packs" != "$target_packs" ] || [ "$source_subs" != "$target_subs" ]; then
    log_warn "Row counts do not match! Run verify-migration.ts for detailed analysis."
  else
    log_success "Basic verification passed"
  fi
}

# --- Parse Arguments ---

while [[ $# -gt 0 ]]; do
  case $1 in
    --source)
      SOURCE_URL="$2"
      shift 2
      ;;
    --target)
      TARGET_URL="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --since)
      SINCE="$2"
      shift 2
      ;;
    --help)
      usage
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      ;;
  esac
done

# --- Validate Arguments ---

if [ -z "${SOURCE_URL:-}" ] || [ -z "${TARGET_URL:-}" ]; then
  log_error "Both --source and --target are required"
  usage
fi

if [ "$MODE" != "full" ] && [ "$MODE" != "incremental" ]; then
  log_error "Mode must be 'full' or 'incremental'"
  usage
fi

# --- Main ---

echo ""
echo "============================================="
echo "Data Migration Script"
echo "============================================="
echo "Mode: $MODE"
echo "Timestamp: $TIMESTAMP"
echo "============================================="
echo ""

check_prerequisites
test_connections

case $MODE in
  full)
    migrate_full
    ;;
  incremental)
    migrate_incremental
    ;;
esac

verify_migration

echo ""
log_success "Migration script complete!"
echo ""
echo "Next steps:"
echo "  1. Run verify-migration.ts for detailed verification"
echo "  2. Test application endpoints against target database"
echo "  3. If all checks pass, proceed with DNS cutover"
echo ""
