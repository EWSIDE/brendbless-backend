#!/bin/bash
# =============================================================
# BRENDBLESS — полный деплой на Ubuntu 22.04 (Yandex Cloud VPS)
# Запускать от root: bash setup.sh
# =============================================================

set -e

# ── Цвета для вывода ──────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Переменные — ЗАПОЛНИ ПЕРЕД ЗАПУСКОМ ──────────────────────
DOMAIN="brandbless.ru"
API_DOMAIN="api.brandbless.ru"
GITHUB_FRONTEND="https://github.com/EWSIDE/brendbless-frontend.git"
GITHUB_BACKEND="https://github.com/EWSIDE/brendbless-backend.git"
APP_DIR="/var/www"
DB_NAME="brendbless"
DB_USER="brendbless"
DB_PASS="$(openssl rand -base64 24)"   # генерируется автоматически

# SMTP настройки (скопируй из Railway env)
SMTP_HOST="smtp.mail.ru"
SMTP_PORT="465"
SMTP_USER="support@brandbless.ru"
SMTP_PASS="DBMyjhL5zj7wLZlGKhvV"

# JWT секреты
JWT_SECRET="addjasiodjaosfhwieghfweruygvwehfvweivhjweiuvhwevwsfvyhsdvusdv"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"
COOKIE_SECRET="afdghdjgiuerhjgihuefvhewygherghsdjiuoghwerughfouidshfw"

# ─────────────────────────────────────────────────────────────

info "=== Шаг 1: Обновление системы ==="
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw postgresql postgresql-contrib

# ── Node.js 20 ────────────────────────────────────────────────
info "=== Шаг 2: Установка Node.js 20 ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

# ── PM2 ───────────────────────────────────────────────────────
info "=== Шаг 3: Установка PM2 ==="
npm install -g pm2

# ── PostgreSQL ────────────────────────────────────────────────
info "=== Шаг 4: Настройка PostgreSQL ==="
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || warn "Пользователь $DB_USER уже существует"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || warn "База $DB_NAME уже существует"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
info "DATABASE_URL: $DATABASE_URL"

# ── Директории ────────────────────────────────────────────────
info "=== Шаг 5: Создание директорий ==="
mkdir -p $APP_DIR/backend $APP_DIR/frontend
mkdir -p /data/uploads
chown -R www-data:www-data /data/uploads

# ── Клонирование репозиториев ─────────────────────────────────
info "=== Шаг 6: Клонирование репозиториев ==="

if [ -d "$APP_DIR/backend/.git" ]; then
  info "Backend уже клонирован, делаем git pull..."
  cd $APP_DIR/backend && git pull
else
  git clone $GITHUB_BACKEND $APP_DIR/backend
fi

if [ -d "$APP_DIR/frontend/.git" ]; then
  info "Frontend уже клонирован, делаем git pull..."
  cd $APP_DIR/frontend && git pull
else
  git clone $GITHUB_FRONTEND $APP_DIR/frontend
fi

# ── Backend .env ──────────────────────────────────────────────
info "=== Шаг 7: Создание .env для бэкенда ==="
cat > $APP_DIR/backend/.env << EOF
NODE_ENV=production
PORT=5000
API_URL=https://$API_DOMAIN
FRONTEND_URL=https://$DOMAIN,https://www.$DOMAIN
DATABASE_URL=$DATABASE_URL
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=true
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=$JWT_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN=$JWT_REFRESH_EXPIRES_IN
COOKIE_SECRET=$COOKIE_SECRET
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/data/uploads
EOF

# ── Frontend .env ─────────────────────────────────────────────
info "=== Шаг 8: Создание .env для фронтенда ==="
cat > $APP_DIR/frontend/.env.production << EOF
NEXT_PUBLIC_API_URL=https://$API_DOMAIN
NODE_ENV=production
EOF

# ── Установка зависимостей и сборка бэкенда ──────────────────
info "=== Шаг 9: Сборка бэкенда ==="
cd $APP_DIR/backend
npm ci --production=false
npm run build
npx prisma generate
npx prisma db push --accept-data-loss

# ── Установка зависимостей и сборка фронтенда ────────────────
info "=== Шаг 10: Сборка фронтенда ==="
cd $APP_DIR/frontend
npm ci
npm run build

# ── PM2 конфиг ────────────────────────────────────────────────
info "=== Шаг 11: Настройка PM2 ==="
cat > /var/www/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'brendbless-backend',
      cwd: '/var/www/backend',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
    {
      name: 'brendbless-frontend',
      cwd: '/var/www/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
EOF

pm2 delete all 2>/dev/null || true
pm2 start /var/www/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

# ── Nginx конфиг ──────────────────────────────────────────────
info "=== Шаг 12: Настройка Nginx ==="

cat > /etc/nginx/sites-available/brendbless << EOF
# Frontend — brandbless.ru
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}

# Backend API — api.brandbless.ru
server {
    listen 80;
    server_name $API_DOMAIN;

    # Uploads — отдаём статику напрямую через nginx (быстрее)
    location /uploads/ {
        alias /data/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        client_max_body_size 10M;
    }
}
EOF

ln -sf /etc/nginx/sites-available/brendbless /etc/nginx/sites-enabled/brendbless
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── Firewall ──────────────────────────────────────────────────
info "=== Шаг 13: Настройка UFW ==="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── SSL сертификаты ───────────────────────────────────────────
info "=== Шаг 14: SSL сертификаты (Let's Encrypt) ==="
warn "Убедись что DNS записи уже указывают на этот сервер!"
warn "A $DOMAIN -> $(curl -s ifconfig.me)"
warn "A $API_DOMAIN -> $(curl -s ifconfig.me)"
read -p "DNS уже настроен? (y/n): " dns_ready
if [ "$dns_ready" = "y" ]; then
  certbot --nginx -d $DOMAIN -d www.$DOMAIN -d $API_DOMAIN --non-interactive --agree-tos -m $SMTP_USER
  systemctl reload nginx
  info "SSL сертификаты установлены!"
else
  warn "Пропускаем SSL. Запусти вручную после настройки DNS:"
  warn "certbot --nginx -d $DOMAIN -d www.$DOMAIN -d $API_DOMAIN"
fi

# ── Итог ──────────────────────────────────────────────────────
info ""
info "=== ДЕПЛОЙ ЗАВЕРШЁН ==="
info "Frontend: http://$DOMAIN"
info "Backend:  http://$API_DOMAIN"
info "PM2 статус: pm2 status"
info "Логи backend: pm2 logs brendbless-backend"
info "Логи frontend: pm2 logs brendbless-frontend"
info ""
info "Пароль PostgreSQL (сохрани!): $DB_PASS"
info "DATABASE_URL: $DATABASE_URL"
