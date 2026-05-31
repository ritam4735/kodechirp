# KodeChirp Java Sandbox (Future-ready)
# Hardened, minimal image for Java compilation and execution

FROM eclipse-temurin:21-jdk-alpine

# Create non-root sandbox user
RUN addgroup -S sandbox && adduser -S -G sandbox sandbox

WORKDIR /app

USER sandbox
