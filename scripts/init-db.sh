#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Initialize database with schema, seed data, and versioned migrations
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DB_NAME="${DB_NAME:-kodechirp}"
DB_USER="${DB_USER:-kodechirp}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-${PGPORT:-5433}}"

echo "🗄️  Initializing KodeChirp database..."
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# 1. Apply core schema
echo "  📋 Applying base schema..."
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$PROJECT_ROOT/database/schema.sql"

# 2. Apply seeds (if directory exists)
if [ -d "$PROJECT_ROOT/database/seeds" ]; then
    for seed_file in "$PROJECT_ROOT/database/seeds"/*.sql; do
        if [ -f "$seed_file" ]; then
            echo "  🌱 Applying seed: $(basename "$seed_file")"
            psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                -f "$seed_file"
        fi
    done
fi

# 3. Ensure migration tracking table exists
echo "  🛡️  Ensuring schema_migrations table exists..."
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
EOF

# 4. Apply versioned migrations
echo "  🔄 Processing migrations..."
for migration_file in $(ls "$PROJECT_ROOT/database/migrations"/*.sql 2>/dev/null | sort -V); do
    if [ -f "$migration_file" ]; then
        migration_name="$(basename "$migration_file")"
        is_applied=$(psql -v ON_ERROR_STOP=1 -tA -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM schema_migrations WHERE version = '$migration_name';" 2>/dev/null || echo "")
        if [ "$is_applied" = "1" ]; then
            echo "  ⏭️  Skipping already applied: $migration_name"
        else
            echo "  ▶️  Applying migration: $migration_name"
            psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                -f "$migration_file"
            psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                -c "INSERT INTO schema_migrations (version) VALUES ('$migration_name');"
            echo "  ✅ Applied: $migration_name"
        fi
    fi
done

echo ""
echo "✅ Database initialized and migrated successfully!"
