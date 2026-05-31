#!/bin/bash
set -e

echo "Building KodeChirp Sandboxes..."

cd "$(dirname "$0")/.."

echo "[1/4] Building Python Sandbox..."
docker build -t kodechirp-python-sandbox ./python-sandbox

echo "[2/4] Building C++ Sandbox..."
docker build -t kodechirp-cpp-sandbox ./cpp-sandbox

echo "[3/4] Building Node Sandbox..."
docker build -t kodechirp-node-sandbox ./node-sandbox

echo "[4/4] Building C Sandbox..."
docker build -t kodechirp-c-sandbox ./c-sandbox

echo "All sandboxes built successfully!"
