# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
# openssl: requerido por el engine de Prisma en Alpine.
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
# 'prisma' está en dependencies, así que 'migrate deploy' funciona en runtime.
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force
COPY --from=build /app/dist ./dist
# Se sobreescribe con el volumen montado en producción (ver docker-compose.yml);
# existe igual acá para que arranque bien sin volumen (ej. local sin compose).
RUN mkdir -p /app/uploads
EXPOSE 4000
# Aplica migraciones pendientes y arranca. Idempotente: si no hay migraciones, sigue.
CMD ["npm", "run", "start:migrate-prod"]
