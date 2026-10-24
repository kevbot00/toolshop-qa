# Same reason as ui-native.Dockerfile: PHP segfaults under x86 emulation on Apple Silicon.
# Rebuilds the published image's PHP runtime for the host architecture and copies the app code
# (pure PHP, so it is architecture-independent) out of the published image unchanged.
ARG SPRINT=sprint5
FROM --platform=linux/amd64 testsmith/practice-software-testing-${SPRINT}-api AS source

FROM php:8.3-fpm-alpine
RUN apk add --no-cache mysql-client libzip libpng libjpeg-turbo libwebp freetype icu libffi && \
    apk add --no-cache --virtual .build icu-dev zlib-dev g++ make autoconf libffi-dev libzip-dev \
      libpng-dev libwebp-dev libjpeg-turbo-dev freetype-dev && \
    docker-php-ext-configure gd --enable-gd --with-freetype --with-jpeg --with-webp && \
    docker-php-ext-install gd pdo_mysql ffi intl opcache exif zip && \
    apk del .build
COPY --from=source /usr/local/etc/php/conf.d/opcache.ini /usr/local/etc/php/conf.d/php-ini-overrides.ini /usr/local/etc/php/conf.d/
COPY --from=source --chown=www-data:www-data /var/www /var/www
WORKDIR /var/www
USER www-data
