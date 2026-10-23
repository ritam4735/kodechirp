#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Automatically apply migrations when initializing a fresh database in Docker
# ─────────────────────────────────────────────────────────────────────────────

set -e

MIGRATIONS_DIR="/docker-entrypoint-initdb.d/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    echo "🔄 Applying database migrations in $MIGRATIONS_DIR..."
    for migration_file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V); do
        if [ -f "$migration_file" ]; then
            echo "  Applying $(basename "$migration_file")..."
            psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration_file"
        fi
    done
    echo "✅ Database migrations applied successfully!"
fi
