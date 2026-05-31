# Multi-stage builds are less relevant here as we need the runtime, but we use the slimmest Alpine base
FROM python:3.11-alpine

# Remove unnecessary cache and tools if any, but python-alpine is already very minimal.
# Create a dedicated non-root user for sandboxed execution
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

# Set the default working directory
WORKDIR /app

# Switch to the non-root user
USER sandbox
