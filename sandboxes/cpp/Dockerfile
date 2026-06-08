# KodeChirp C++ Sandbox
# Hardened, minimal image for C++ compilation and execution

FROM alpine:3.19

# Install g++, minimal build tools, and GNU time for memory profiling
RUN apk add --no-cache g++ libc-dev time

# Create non-root sandbox user
RUN addgroup -S sandbox && adduser -S -G sandbox sandbox

WORKDIR /app

USER sandbox
