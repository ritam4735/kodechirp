FROM node:20-alpine

# Ensure only necessary packages are present
# node-alpine is already optimized.
# Create dedicated non-root user for sandboxed execution
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

# Set the default working directory
WORKDIR /app

# Switch to the non-root user
USER sandbox
