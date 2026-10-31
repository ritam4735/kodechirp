#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
CERT_FILE="${CERT_DIR}/cert.pem"
KEY_FILE="${CERT_DIR}/key.pem"

mkdir -p "$CERT_DIR"
mkdir -p /etc/nginx/conf.d
mkdir -p /etc/nginx/includes

# 1. Automatic development SSL certificates if not mounted
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "[nginx] No SSL certificates found in $CERT_DIR. Generating self-signed development certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/CN=localhost/O=KodeChirp/C=US"
    chmod 644 "$CERT_FILE"
    chmod 600 "$KEY_FILE"
    echo "[nginx] Self-signed certificates successfully generated at $CERT_FILE and $KEY_FILE."
else
    echo "[nginx] Using provided SSL certificates at $CERT_FILE."
fi

# 2. Configure HTTP (Port 80) and HTTPS (Port 443) based on ENABLE_SSL_REDIRECT
CONF_FILE="/etc/nginx/conf.d/kodechirp.conf"
ENABLE_REDIRECT="${ENABLE_SSL_REDIRECT:-false}"

if [ "$ENABLE_REDIRECT" = "true" ] || [ "$ENABLE_REDIRECT" = "1" ]; then
    echo "[nginx] ENABLE_SSL_REDIRECT=true: Configuring HTTP-to-HTTPS 301 redirection on port 80..."
    cat << 'EOF' > "$CONF_FILE"
# HTTP Server: Redirect all traffic to HTTPS (preserving /health for load balancers)
server {
    listen 80;
    listen [::]:80;
    server_name _;

    location = /health {
        proxy_pass http://gateway/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server: SSL Termination
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name _;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    include /etc/nginx/includes/locations.conf;
}
EOF
else
    echo "[nginx] ENABLE_SSL_REDIRECT=false: Allowing direct HTTP on port 80 (Local Dev Mode) + HTTPS on port 443..."
    cat << 'EOF' > "$CONF_FILE"
# HTTP Server: Direct traffic proxying (Dev mode without requiring SSL certificates)
server {
    listen 80;
    listen [::]:80;
    server_name _;

    include /etc/nginx/includes/locations.conf;
}

# HTTPS Server: SSL Termination (Available alongside HTTP)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name _;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    include /etc/nginx/includes/locations.conf;
}
EOF
fi

# Verify Nginx configuration syntax
echo "[nginx] Testing Nginx configuration syntax..."
nginx -t

exec "$@"
