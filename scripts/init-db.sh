#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Initialize database with schema and seed data
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DB_NAME="${DB_NAME:-kodechirp}"
DB_USER="${DB_USER:-kodechirp}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "🗄️  Initializing KodeChirp database..."
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Apply schema
echo "  📋 Applying schema..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$PROJECT_ROOT/database/schema.sql"

# Apply seeds
for seed_file in "$PROJECT_ROOT/database/seeds"/*.sql; do
    if [ -f "$seed_file" ]; then
        echo "  🌱 Applying seed: $(basename "$seed_file")"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -f "$seed_file"
    fi
done

echo ""
echo "✅ Database initialized successfully!"
