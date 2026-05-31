#!/bin/bash

echo "Cleaning up KodeChirp Sandbox artifacts..."

# Remove all dangling images
echo "Removing dangling images..."
docker image prune -f

# Remove stopped containers
echo "Removing stopped containers..."
docker container prune -f

# Remove temporary execution directories
# Temp dirs are typically stored in /tmp/kc_run_*
echo "Cleaning up temporary execution directories..."
rm -rf /tmp/kc_run_*

echo "Cleanup complete."
