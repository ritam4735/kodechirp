#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Seed the local PostgreSQL database with schema and sample data
# Usage: bash scripts/seed-local-db.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-kodechirp}"
DB_USER="${DB_USER:-postgres}"

echo "🐦 Seeding KodeChirp local database..."
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Apply schema
echo "  📐 Applying schema..."
PGPASSWORD="${PGPASSWORD:-ritam123}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "$PROJECT_ROOT/database/schema.sql" 2>&1 | grep -v "already exists" || true

echo ""

# Apply seed data
echo "  🌱 Inserting seed data..."
PGPASSWORD="${PGPASSWORD:-ritam123}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "$PROJECT_ROOT/database/seeds/01-seed-data.sql" 2>&1

echo ""

# Verify
echo "  🔍 Verifying..."
PGPASSWORD="${PGPASSWORD:-ritam123}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT slug, title, difficulty FROM problems ORDER BY created_at;" 2>&1

echo ""
echo "✅ Database seeded successfully!"
