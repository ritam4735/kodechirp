#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# System health verification
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "🏥 KodeChirp System Health Check"
echo "================================"
echo ""

# Gateway
echo -n "  Gateway API:    "
if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ DOWN"
fi

# Worker
echo -n "  Worker API:     "
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ DOWN"
fi

# Frontend
echo -n "  Frontend:       "
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ DOWN"
fi

# PostgreSQL
echo -n "  PostgreSQL:     "
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ DOWN"
fi

# Redis
echo -n "  Redis:          "
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ DOWN"
fi

# Sandbox images
echo ""
echo "  Sandbox Images:"
for img in kodechirp-python-sandbox kodechirp-cpp-sandbox kodechirp-c-sandbox kodechirp-node-sandbox; do
    echo -n "    $img: "
    if docker image inspect "$img" > /dev/null 2>&1; then
        echo "✅ Built"
    else
        echo "❌ Not found"
    fi
done

echo ""
echo "================================"

# Detailed gateway health
echo ""
echo "  Gateway detailed health:"
curl -sf http://localhost:4000/health/detailed 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "    (unavailable)"
