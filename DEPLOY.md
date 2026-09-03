# Deploy en Dokploy (Docker Compose)

Stack: **db** (PostgreSQL) · **backend** (NestJS + Prisma) · **frontend** (Vite build servido por nginx).

Archivos relevantes:

| Archivo | Para qué |
|---|---|
| `docker-compose.yml` | El stack de producción (lo lee Dokploy). |
| `.env.example` | Lista de variables a cargar en Dokploy. |
| `backend/Dockerfile` | Imagen del API. Aplica migraciones al arrancar. |
| `frontend/Dockerfile` + `frontend/nginx.conf` | Build del front + nginx con fallback SPA. |
| `backend/docker-compose.yml` | **Solo dev local** (Postgres/Redis en tu máquina). No lo usa Dokploy. |

---

## 1. Dominios

Necesitás **dos** subdominios apuntando al servidor de Dokploy:

- `qpass.tudominio.com` → servicio **frontend**, puerto **80**
- `api.qpass.tudominio.com` → servicio **backend**, puerto **4000**

> El frontend es estático y el navegador llama directo al API, así que el API necesita su propia URL pública (`VITE_API_URL`). Vite la compila dentro del bundle: si la cambiás, hay que reconstruir el frontend.

## 2. Crear la app en Dokploy

1. **Create Application → Compose**.
2. Fuente: este repositorio, rama a desplegar. Compose Path: `docker-compose.yml`.
3. Pestaña **Environment**: pegá el contenido de `.env.example` y completá:
   - `POSTGRES_PASSWORD` — clave fuerte.
   - `JWT_SECRET` — mínimo 16 caracteres (`openssl rand -base64 32`).
   - `CORS_ORIGEN=https://qpass.tudominio.com`
   - `VITE_API_URL=https://api.qpass.tudominio.com`
4. Pestaña **Domains**, agregá dos:
   - Service `frontend`, Container Port `80`, Host `qpass.tudominio.com`, HTTPS on.
   - Service `backend`, Container Port `4000`, Host `api.qpass.tudominio.com`, HTTPS on.
5. **Deploy**.

## 3. Qué pasa en el arranque

- `db` levanta y espera a estar *healthy* (`pg_isready`).
- `backend` corre `prisma migrate deploy` (aplica migraciones pendientes) y luego `node dist/main`.
- `frontend` sirve el build; nginx manda cualquier ruta desconocida a `index.html`.

Healthchecks: `backend` expone `GET /health` → `{ "ok": true }`.

## 4. Usuarios iniciales (seed)

`migrate deploy` **no** siembra datos. Para crear los usuarios de prueba (admin, etc.),
una sola vez, desde tu máquina apuntando a la BD de producción:

```bash
cd backend
DATABASE_URL="postgresql://qpass:TU_PASSWORD@HOST_PUBLICO:5432/qpass?schema=public" npm run prisma:seed
```

(o creá el usuario Admin a mano). En producción la BD no está expuesta a internet por
defecto; si necesitás el seed, abrí temporalmente el puerto o corré el comando desde el
propio servidor.

## 5. Actualizaciones

Cada push a la rama configurada → **Redeploy** en Dokploy. Las migraciones nuevas se
aplican solas. Si tocaste `VITE_API_URL`, el frontend se reconstruye igual (build arg).

## 6. Redis / colas de correo

Hoy no se usa (`MailService` solo loguea). Cuando se active BullMQ: agregá un servicio
`redis:7-alpine` al compose en la red `internal` y seteá `REDIS_URL=redis://redis:6379`.
