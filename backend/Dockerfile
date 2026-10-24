FROM php:8.4-cli

RUN apt-get update && apt-get install -y --no-install-recommends git unzip libsqlite3-dev libzip-dev \
    && docker-php-ext-install pdo_sqlite zip bcmath \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
RUN rm -f .env database/database.sqlite \
    && composer dump-autoload --optimize --no-dev \
    && chmod +x docker/start.sh

ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr DB_CONNECTION=sqlite DB_DATABASE=/data/database.sqlite
EXPOSE 8080
CMD ["docker/start.sh"]
