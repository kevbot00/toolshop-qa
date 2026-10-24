# The published testsmith web image is arm64-only, so it can't run on x86 CI runners.
# It's just nginx plus a config file, so build the equivalent from the multi-arch nginx image.
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
