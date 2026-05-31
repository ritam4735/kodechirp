FROM node:20-alpine

WORKDIR /app

# Install dependencies first (Docker layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Copy source
COPY src/ ./src/

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/server.js"]
