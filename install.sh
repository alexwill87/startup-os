#!/usr/bin/env bash
# ============================================================
# Startup OS — Self-hosted installer
# ============================================================
# Installs a cockpit instance with PostgreSQL + PostgREST on Docker.
# Usage:
#   curl -sL <repo>/install.sh | bash -s -- --name my-cockpit --port 3031 --db-name oa_cockpit
#   OR
#   ./install.sh --name my-cockpit --port 3031 --db-name oa_cockpit
#
# Prerequisites: Docker, Node.js 20+, npm, git
# ============================================================

set -euo pipefail

# ---- Defaults ----
APP_NAME="startup-os"
APP_PORT="3031"
DB_NAME="cockpit_db"
DB_CONTAINER="cockpit-postgres"
API_PORT="3100"
POSTGREST_CONTAINER="cockpit-api"
DB_PASSWORD="cockpit-$(openssl rand -hex 8)"
JWT_SECRET="$(openssl rand -hex 32)"
INSTALL_DIR="$(pwd)/${APP_NAME}"

# ---- Parse args ----
while [[ $# -gt 0 ]]; do
  case $1 in
    --name) APP_NAME="$2"; INSTALL_DIR="$(pwd)/${APP_NAME}"; shift 2 ;;
    --port) APP_PORT="$2"; shift 2 ;;
    --db-name) DB_NAME="$2"; shift 2 ;;
    --db-container) DB_CONTAINER="$2"; shift 2 ;;
    --api-port) API_PORT="$2"; shift 2 ;;
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

echo ""
echo "========================================"
echo "  Startup OS — Self-hosted installer"
echo "========================================"
echo "  App name:     $APP_NAME"
echo "  Install dir:  $INSTALL_DIR"
echo "  App port:     $APP_PORT"
echo "  DB name:      $DB_NAME"
echo "  API port:     $API_PORT"
echo ""

# ---- Check prerequisites ----
for cmd in docker node npm git; do
  if ! command -v $cmd &>/dev/null; then
    echo "ERROR: $cmd is required but not installed."
    exit 1
  fi
done

# ---- Step 1: Clone repo ----
if [[ -d "$INSTALL_DIR" ]]; then
  echo "Directory $INSTALL_DIR already exists. Pulling latest..."
  cd "$INSTALL_DIR" && git pull
else
  echo ">>> Cloning startup-os..."
  git clone https://github.com/alexwill87/startup-os.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# ---- Step 2: Check/create PostgreSQL container ----
if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo ">>> PostgreSQL container '$DB_CONTAINER' already exists."
  # Check if DB exists
  if docker exec "$DB_CONTAINER" psql -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "    Database '$DB_NAME' already exists. Skipping creation."
  else
    echo "    Creating database '$DB_NAME'..."
    docker exec "$DB_CONTAINER" psql -U postgres -c "CREATE DATABASE $DB_NAME;"
    docker exec -i "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" < setup_selfhosted.sql
  fi
else
  echo ">>> Starting PostgreSQL container..."
  docker run -d --name "$DB_CONTAINER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    --restart unless-stopped \
    postgres:15
  echo "    Waiting for PostgreSQL to start..."
  sleep 3
  echo "    Creating database '$DB_NAME'..."
  docker exec "$DB_CONTAINER" psql -U postgres -c "CREATE DATABASE $DB_NAME;"
  docker exec -i "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" < setup_selfhosted.sql
fi

# ---- Step 3: Setup PostgREST roles ----
echo ">>> Setting up PostgREST roles..."
docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -c "
  DO \$\$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator LOGIN PASSWORD '$DB_PASSWORD'; END IF;
  END \$\$;
  GRANT anon TO authenticator;
  GRANT USAGE ON SCHEMA public TO anon;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
" 2>/dev/null || true

# ---- Step 4: Start PostgREST ----
if docker ps --format '{{.Names}}' | grep -q "^${POSTGREST_CONTAINER}$"; then
  echo ">>> PostgREST container already running."
else
  echo ">>> Starting PostgREST on port $API_PORT..."
  docker run -d --name "$POSTGREST_CONTAINER" \
    --link "$DB_CONTAINER":db \
    -p "$API_PORT":3000 \
    -e PGRST_DB_URI="postgres://authenticator:${DB_PASSWORD}@db:5432/${DB_NAME}" \
    -e PGRST_DB_SCHEMAS="public" \
    -e PGRST_DB_ANON_ROLE="anon" \
    -e PGRST_JWT_SECRET="$JWT_SECRET" \
    --restart unless-stopped \
    postgrest/postgrest
fi

# ---- Step 5: Generate JWT anon key ----
echo ">>> Generating anon JWT..."
ANON_KEY=$(node -e "
const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const p=Buffer.from(JSON.stringify({role:'anon',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+315360000})).toString('base64url');
const s=require('crypto').createHmac('sha256','$JWT_SECRET').update(h+'.'+p).digest('base64url');
console.log(h+'.'+p+'.'+s);
")

# ---- Step 6: Create .env.local ----
echo ">>> Writing .env.local..."
cat > .env.local <<ENVEOF
NEXT_PUBLIC_SUPABASE_URL=http://localhost:$API_PORT
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:$APP_PORT
ENVEOF

# ---- Step 7: Install and build ----
echo ">>> npm install..."
npm install --silent 2>/dev/null
echo ">>> npm run build..."
npm run build 2>/dev/null

# ---- Step 8: Start with PM2 (if available) ----
if command -v pm2 &>/dev/null; then
  pm2 delete "$APP_NAME" 2>/dev/null || true
  PORT=$APP_PORT pm2 start npm --name "$APP_NAME" -- run start
  echo ""
  echo "========================================"
  echo "  DONE! Cockpit running on port $APP_PORT"
  echo "========================================"
  echo "  URL:  http://localhost:$APP_PORT"
  echo "  API:  http://localhost:$API_PORT"
  echo "  PM2:  pm2 logs $APP_NAME"
  echo "========================================"
else
  echo ""
  echo "========================================"
  echo "  DONE! Ready to start."
  echo "========================================"
  echo "  Run: PORT=$APP_PORT npm start"
  echo "  API: http://localhost:$API_PORT"
  echo "========================================"
fi
