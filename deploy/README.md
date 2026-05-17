# Деплой BRENDBLESS на Yandex Cloud VPS

## Что нужно купить

В Yandex Cloud Console (console.yandex.cloud):

1. **Compute Cloud → Создать ВМ**
   - Образ: Ubuntu 22.04 LTS
   - Платформа: standard-v3
   - vCPU: 2, RAM: 4 GB
   - Диск: SSD 30 GB
   - Публичный IP: включить (статический)
   - ~1400 ₽/мес

2. Запомни публичный IP адрес сервера (например `51.250.10.100`)

---

## Шаг 1 — Настройка DNS

Зайди в Cloudflare (или где у тебя DNS для brandbless.ru) → DNS:

| Тип | Имя | Значение | Прокси |
|-----|-----|----------|--------|
| A | brandbless.ru | `<IP сервера>` | **DNS only** (серое облако) |
| A | www | `<IP сервера>` | **DNS only** |
| A | api | `<IP сервера>` | **DNS only** |

**Важно**: серое облако (DNS only), не оранжевое — иначе трафик пойдёт через Cloudflare и снова будет блокироваться в России.

DNS обновляется до 24 часов, обычно 5-15 минут.

---

## Шаг 2 — Подключение к серверу

```bash
ssh root@<IP сервера>
```

---

## Шаг 3 — Запуск скрипта деплоя

```bash
# Скачай скрипт
curl -O https://raw.githubusercontent.com/EWSIDE/brendbless-backend/main/deploy/setup.sh
# или скопируй содержимое setup.sh и вставь в файл вручную

# Сделай исполняемым и запусти
chmod +x setup.sh
bash setup.sh
```

Скрипт автоматически:
- Установит Node.js 20, PostgreSQL, nginx, PM2, certbot
- Склонирует оба репозитория
- Создаст .env файлы
- Соберёт фронтенд и бэкенд
- Настроит nginx
- Запустит всё через PM2
- Установит SSL сертификаты (если DNS уже настроен)

---

## Шаг 4 — Проверка

```bash
# Статус процессов
pm2 status

# Логи бэкенда
pm2 logs brendbless-backend --lines 50

# Логи фронтенда
pm2 logs brendbless-frontend --lines 50

# Проверка nginx
nginx -t
systemctl status nginx

# Проверка API
curl https://api.brandbless.ru/api/health
```

---

## Обновление после git push

После того как запушил изменения в GitHub:

```bash
ssh root@<IP сервера>
bash /var/www/update.sh
```

---

## Полезные команды

```bash
# Перезапуск всего
pm2 restart all

# Перезапуск только бэкенда
pm2 restart brendbless-backend

# Перезапуск только фронтенда
pm2 restart brendbless-frontend

# Просмотр логов в реальном времени
pm2 logs

# Статус nginx
systemctl status nginx

# Перезагрузка nginx
systemctl reload nginx

# Обновить SSL сертификат вручную
certbot renew

# Подключение к PostgreSQL
sudo -u postgres psql brendbless
```

---

## Структура на сервере

```
/var/www/
  backend/          ← Express API (порт 5000)
  frontend/         ← Next.js (порт 3000)
  ecosystem.config.js

/data/uploads/      ← загруженные картинки товаров

/etc/nginx/sites-available/brendbless  ← nginx конфиг
```

---

## Если что-то пошло не так

**Сайт не открывается:**
```bash
pm2 status          # проверь что оба процесса online
systemctl status nginx
curl http://localhost:3000  # фронтенд напрямую
curl http://localhost:5000/api/health  # бэкенд напрямую
```

**Ошибка сборки фронтенда:**
```bash
cd /var/www/frontend
npm run build 2>&1 | tail -50
```

**Ошибка базы данных:**
```bash
cd /var/www/backend
npx prisma db push
```

**SSL не работает:**
```bash
certbot --nginx -d brandbless.ru -d www.brandbless.ru -d api.brandbless.ru
```
