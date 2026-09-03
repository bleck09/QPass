# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

# Vite "hornea" las VITE_* en el bundle EN TIEMPO DE BUILD, no en runtime.
# Por defecto "/api": el nginx de este contenedor proxya /api -> backend (mismo
# dominio). Solo se pasa una URL absoluta si el API tiene su propio subdominio.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- runtime (nginx sirve el estático) ----------
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
