# Stage 1: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Set dummy DATABASE_URL for all prisma operations during build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

# Set dummy DATABASE_URL for npm ci postinstall scripts (will be overridden at runtime)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
COPY uploads ./uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/server.js"]
