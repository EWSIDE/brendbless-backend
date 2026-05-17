#!/bin/bash
# =============================================================
# BRENDBLESS — обновление после git push
# Запускать на VPS: bash /var/www/update.sh
# =============================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

APP_DIR="/var/www"

# ── Обновление бэкенда ────────────────────────────────────────
info "=== Обновление бэкенда ==="
cd $APP_DIR/backend
git pull
npm ci --production=false
npm run build
npx prisma generate
npx prisma db push --accept-data-loss
pm2 restart brendbless-backend
info "Бэкенд обновлён и перезапущен"

# ── Обновление фронтенда ──────────────────────────────────────
info "=== Обновление фронтенда ==="
cd $APP_DIR/frontend
git pull
npm ci
npm run build
pm2 restart brendbless-frontend
info "Фронтенд обновлён и перезапущен"

info ""
info "=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ==="
pm2 status
