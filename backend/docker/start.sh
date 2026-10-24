#!/bin/sh
# Container entrypoint: prepare the SQLite file, migrate, run the scheduler and serve the API.
set -e
mkdir -p "$(dirname "$DB_DATABASE")"
touch "$DB_DATABASE"
php artisan config:cache
php artisan route:cache
php artisan migrate --force
if [ "$HEYVALLA_ALLOW_DEMO_SEED" = "true" ]; then php artisan heyvalla:demo; fi
php artisan schedule:work &
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
