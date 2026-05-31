#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Build all sandbox Docker images
# Run from project root: ./scripts/build-sandboxes.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SANDBOX_DIR="$PROJECT_ROOT/sandboxes"

echo "🔨 Building KodeChirp sandbox images..."
echo ""

# Build each sandbox
declare -A SANDBOXES=(
    ["python"]="kodechirp-python-sandbox"
    ["cpp"]="kodechirp-cpp-sandbox"
    ["c"]="kodechirp-c-sandbox"
    ["node"]="kodechirp-node-sandbox"
    ["java"]="kodechirp-java-sandbox"
)

for dir in "${!SANDBOXES[@]}"; do
    image="${SANDBOXES[$dir]}"
    dockerfile="$SANDBOX_DIR/$dir/Dockerfile"

    if [ -f "$dockerfile" ]; then
        echo "  📦 Building $image from $dir/Dockerfile..."
        docker build -t "$image" -f "$dockerfile" "$SANDBOX_DIR/$dir" --quiet
        echo "  ✅ $image built successfully"
    else
        echo "  ⚠️  Skipping $dir (no Dockerfile found)"
    fi
done

echo ""
echo "🎉 All sandbox images built!"
echo ""
echo "Built images:"
docker images --filter "reference=kodechirp-*-sandbox" --format "  {{.Repository}}:{{.Tag}} ({{.Size}})"
