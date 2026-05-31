#!/bin/bash
set -e

echo "Rebuilding KodeChirp Sandboxes without cache..."

cd "$(dirname "$0")/.."

echo "[1/4] Rebuilding Python Sandbox..."
docker build --no-cache -t kodechirp-python-sandbox ./python-sandbox

echo "[2/4] Rebuilding C++ Sandbox..."
docker build --no-cache -t kodechirp-cpp-sandbox ./cpp-sandbox

echo "[3/4] Rebuilding Node Sandbox..."
docker build --no-cache -t kodechirp-node-sandbox ./node-sandbox

echo "[4/4] Rebuilding C Sandbox..."
docker build --no-cache -t kodechirp-c-sandbox ./c-sandbox

echo "All sandboxes rebuilt successfully!"
