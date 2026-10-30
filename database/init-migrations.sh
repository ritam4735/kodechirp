#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Automatically apply migrations when initializing a fresh database in Docker
# or when running incremental updates. Tracks applied migrations in
# schema_migrations to ensure idempotent execution.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/docker-entrypoint-initdb.d/migrations}"
PG_USER="${POSTGRES_USER:-kodechirp}"
PG_DB="${POSTGRES_DB:-kodechirp}"

if [ -d "$MIGRATIONS_DIR" ]; then
    echo "🔄 Ensuring schema_migrations tracking table exists..."
    psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" <<'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
EOF

    echo "🔄 Checking and applying database migrations in $MIGRATIONS_DIR..."
    for migration_file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V); do
        if [ -f "$migration_file" ]; then
            migration_name="$(basename "$migration_file")"
            is_applied=$(psql -v ON_ERROR_STOP=1 -tA -U "$PG_USER" -d "$PG_DB" -c "SELECT 1 FROM schema_migrations WHERE version = '$migration_name';" 2>/dev/null || echo "")
            if [ "$is_applied" = "1" ]; then
                echo "  ⏭️  Skipping already applied: $migration_name"
            else
                echo "  ▶️  Applying $migration_name..."
                psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" -f "$migration_file"
                psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" -c "INSERT INTO schema_migrations (version) VALUES ('$migration_name');"
                echo "  ✅ Successfully applied: $migration_name"
            fi
        fi
    done
    echo "✅ Database migrations processed successfully!"
fi
