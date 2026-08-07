#!/bin/bash
set -e

echo "🕉️  DivineKart Backend — Starting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for PostgreSQL using pg_isready (installed in the runner image)
DB_USER="${POSTGRES_USER:-medusa_user}"
DB_NAME="${POSTGRES_DB:-medusa_db}"

echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 -U "$DB_USER" -d "$DB_NAME" -q; do
  echo "   Waiting for postgres to be ready..."
  sleep 2
done
echo "✅ PostgreSQL is ready"

# Run database migrations
echo "🔄 Running database migrations..."
npx medusa db:migrate || {
  echo "⚠️  Migration failed, retrying in 5 seconds..."
  sleep 5
  npx medusa db:migrate
}
echo "✅ Migrations complete"

# Seed the database if RUN_SEED is true or on first boot if needed
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run seed || echo "ℹ️ Seeding already completed or skipped"
fi

# Create admin user (first run only, ignore errors if exists)
if [ "$CREATE_ADMIN" = "true" ]; then
  echo "👤 Creating admin user..."
  npx medusa user -e "${MEDUSA_ADMIN_EMAIL:-admin@divinekart.com}" -p "${MEDUSA_ADMIN_PASSWORD:-supersecret}" 2>/dev/null || echo "ℹ️  Admin user may already exist"
fi

# Start Medusa
echo ""
echo "🚀 Starting Medusa server on port 9000..."
echo "   Admin Dashboard: http://localhost:9000/app"
echo "   Store API:       http://localhost:9000/store"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exec npm run start
