FROM nginx:1.25-alpine

# Install openssl for automated self-signed certificate generation in development
RUN apk add --no-cache openssl

# Remove default boilerplate configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy configurations
COPY nginx.conf /etc/nginx/nginx.conf
COPY includes/ /etc/nginx/includes/
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80 443

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
