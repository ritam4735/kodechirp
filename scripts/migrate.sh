#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# KodeChirp Database Migration Runner
# 
# Usage:
#   ./scripts/migrate.sh [up|status|rollback <version>]
# 
# Environment Variables:
#   DB_NAME (default: kodechirp)
#   DB_USER (default: kodechirp)
#   DB_HOST (default: localhost)
#   DB_PORT (default: 5433 or PGPORT or 5432)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/database/migrations"

DB_NAME="${DB_NAME:-kodechirp}"
DB_USER="${DB_USER:-kodechirp}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-${PGPORT:-5433}}"

COMMAND="${1:-up}"

export PGPASSWORD="${POSTGRES_PASSWORD:-kodechirp_dev}"

run_psql() {
    psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
}

ensure_migrations_table() {
    run_psql <<'EOF' >/dev/null
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
EOF
}

case "$COMMAND" in
    status)
        ensure_migrations_table
        echo "📊 Migration Status for database '$DB_NAME' ($DB_HOST:$DB_PORT):"
        echo ""
        printf "%-45s | %-10s | %-25s\n" "Migration" "Status" "Applied At"
        printf "%s\n" "----------------------------------------------+------------+--------------------------"
        for migration_file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V); do
            migration_name="$(basename "$migration_file")"
            applied_info=$(run_psql -tA -c "SELECT applied_at::text FROM schema_migrations WHERE version = '$migration_name';" 2>/dev/null || echo "")
            if [ -n "$applied_info" ]; then
                printf "%-45s | %-10s | %-25s\n" "$migration_name" "APPLIED" "$applied_info"
            else
                printf "%-45s | %-10s | %-25s\n" "$migration_name" "PENDING" "—"
            fi
        done
        ;;

    up)
        ensure_migrations_table
        echo "🔄 Checking and running pending migrations for '$DB_NAME'..."
        applied_count=0
        for migration_file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V); do
            if [ -f "$migration_file" ]; then
                migration_name="$(basename "$migration_file")"
                is_applied=$(run_psql -tA -c "SELECT 1 FROM schema_migrations WHERE version = '$migration_name';" 2>/dev/null || echo "")
                if [ "$is_applied" = "1" ]; then
                    echo "  ⏭️  Skipping already applied: $migration_name"
                else
                    echo "  ▶️  Applying $migration_name..."
                    run_psql -f "$migration_file"
                    run_psql -c "INSERT INTO schema_migrations (version) VALUES ('$migration_name');" >/dev/null
                    echo "  ✅ Applied: $migration_name"
                    applied_count=$((applied_count + 1))
                fi
            fi
        done
        if [ "$applied_count" -eq 0 ]; then
            echo "✨ All migrations are up to date! Nothing to apply."
        else
            echo "🎉 Successfully applied $applied_count migration(s)."
        fi
        ;;

    rollback)
        if [ -z "${2:-}" ]; then
            echo "❌ Error: rollback requires the specific migration version name to revert."
            echo "   Usage: $0 rollback <version.sql>"
            exit 1
        fi
        target_version="$2"
        echo "⚠️  Initiating rollback for: $target_version"
        is_applied=$(run_psql -tA -c "SELECT 1 FROM schema_migrations WHERE version = '$target_version';" 2>/dev/null || echo "")
        if [ "$is_applied" != "1" ]; then
            echo "❌ Error: Migration $target_version is not registered in schema_migrations."
            exit 1
        fi
        rollback_file="$PROJECT_ROOT/database/migrations/rollback/${target_version%.sql}_rollback.sql"
        if [ -f "$rollback_file" ]; then
            echo "  Executing rollback script: $(basename "$rollback_file")..."
            run_psql -f "$rollback_file"
        else
            echo "  ⚠️  No rollback file found at $rollback_file. Only removing registration from schema_migrations."
        fi
        run_psql -c "DELETE FROM schema_migrations WHERE version = '$target_version';" >/dev/null
        echo "✅ Migration $target_version rolled back and unregistered."
        ;;

    *)
        echo "Usage: $0 [up|status|rollback <version>]"
        exit 1
        ;;
esac
