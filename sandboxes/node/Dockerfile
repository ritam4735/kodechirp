# KodeChirp Node.js Sandbox
# Hardened, minimal image for JavaScript execution

FROM node:20-alpine



# Create non-root sandbox user
RUN addgroup -S sandbox && adduser -S -G sandbox sandbox

# Remove npm and other unnecessary tools
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -rf /usr/local/bin/npm \
    && rm -rf /usr/local/bin/npx

WORKDIR /app

USER sandbox
