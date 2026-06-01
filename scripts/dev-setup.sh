#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-command development environment setup
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Setting up KodeChirp development environment..."
echo ""

# 1. Create .env from template if not exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "  📝 Creating .env from template..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo "  ⚠️  Please edit .env with your configuration"
fi

# 2. Build sandbox images
echo ""
echo "  🐳 Building sandbox images..."
bash "$SCRIPT_DIR/build-sandboxes.sh"

# 3. Install gateway dependencies
echo ""
echo "  📦 Installing gateway dependencies..."
cd "$PROJECT_ROOT/gateway" && npm install

# 4. Install frontend dependencies
echo ""
echo "  📦 Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend" && npm install

# 5. Install worker dependencies
echo ""
echo "  🐍 Installing worker dependencies..."
cd "$PROJECT_ROOT/workers" && pip install -r requirements.txt 2>/dev/null || \
    echo "  ℹ️  Python deps should be installed in a venv or via Docker"

# 6. Start infrastructure with Docker Compose
echo ""
echo "  🏗️  Starting infrastructure (PostgreSQL + Redis)..."
cd "$PROJECT_ROOT"
docker compose up -d postgres redis

echo ""
echo "  ⏳ Waiting for services to be healthy..."
sleep 5

echo ""
echo "✅ Development environment ready!"
echo ""
echo "Start services:"
echo "  Gateway:  cd gateway && npm run dev"
echo "  Worker:   cd workers && uvicorn src.main:app --reload --port 8000"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Or use Docker Compose:"
echo "  docker compose up"
