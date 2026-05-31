# Base image: official Python 3.10 Alpine for a small footprint
FROM python:3.10-alpine

# Security & Optimization Variables
# PYTHONDONTWRITEBYTECODE=1: Prevents Python from writing .pyc files to disk (which fails in read-only filesystems)
# PYTHONUNBUFFERED=1: Ensures stdout/stderr are immediately flushed for accurate real-time logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Hardening: Create a dedicated, non-root system user 'sandbox'
# -D: No password
# -g '': Empty GECOS field
# -u 1001: Explicit UID
# -G: Group
# -s /sbin/nologin: Prevent shell login access
RUN addgroup -g 1001 sandbox && \
    adduser -D -g '' -u 1001 -G sandbox -s /sbin/nologin sandbox

# Remove package managers and extra tools to reduce attack surface
RUN rm -rf /sbin/apk /etc/apk /usr/bin/pip /usr/bin/pip3 /usr/local/bin/pip /usr/local/bin/pip3 /bin/ash /bin/sh

# Set up the working directory where user code will be mounted
WORKDIR /app

# Switch to the non-root user
USER sandbox
