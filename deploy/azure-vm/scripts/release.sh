#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/refinery-monitor"
BACKEND_DIR="$APP_ROOT/backend"
FRONTEND_DIR="$APP_ROOT/frontend"
VENV_DIR="$APP_ROOT/.venv"

cd "$APP_ROOT"
git pull origin main

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"

cd "$BACKEND_DIR"
"$VENV_DIR/bin/python" manage.py migrate
"$VENV_DIR/bin/python" manage.py collectstatic --noinput

cd "$FRONTEND_DIR"
npm ci
npm run build

sudo systemctl restart refinery-monitor
sudo systemctl reload nginx

echo "Release completed successfully."
