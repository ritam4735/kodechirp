FROM alpine:3.19

# Install gcc and musl-dev for C compilation.
RUN apk add --no-cache gcc musl-dev

# Create a dedicated non-root user for execution to enforce least privilege.
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

# Set the default working directory
WORKDIR /app

# Switch to the restricted non-root user
USER sandbox
