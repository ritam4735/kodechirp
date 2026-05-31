FROM alpine:3.19

# Install g++ and necessary minimal standard libraries for C++17 compilation.
# musl-dev is required for standard C/C++ libraries on Alpine.
# Avoid build-base if we only need g++.
RUN apk add --no-cache g++ musl-dev

# Create a dedicated non-root user for execution to enforce least privilege.
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

# Set the default working directory
WORKDIR /app

# Switch to the restricted non-root user
USER sandbox
