# KodeChirp Python Sandbox
# Hardened, minimal image for Python code execution

FROM python:3.12-alpine



# Create non-root sandbox user
RUN addgroup -S sandbox && adduser -S -G sandbox sandbox

# Minimal Python environment (no pip, no extras)
RUN rm -rf /usr/lib/python*/ensurepip \
    && rm -rf /usr/lib/python*/idlelib \
    && rm -rf /usr/lib/python*/tkinter

WORKDIR /app

USER sandbox
