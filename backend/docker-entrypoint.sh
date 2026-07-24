#!/bin/sh
set -e

echo "[entrypoint] Generating Prisma Client (needs real DATABASE_URL, available now via docker-compose)..."
npx prisma generate

echo "[entrypoint] Waiting for Postgres to accept connections..."
attempt=0
until npx prisma db push --skip-generate --accept-data-loss > /tmp/db-push.log 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "[entrypoint] Postgres still not reachable after 30 attempts, giving up:"
    cat /tmp/db-push.log
    exit 1
  fi
  echo "[entrypoint] DB not ready yet (attempt $attempt/30) — retrying in 2s..."
  sleep 2
done

echo "[entrypoint] Schema synced via 'prisma db push' (local dev only — see doc/DOCKER_SETUP.md"
echo "[entrypoint] about the difference between this and real migrations used for production)."
echo "[entrypoint] Starting NestJS in watch mode..."
exec npm run start:dev
