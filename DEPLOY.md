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

## 1. Dominio

**Un solo** subdominio apuntando al servidor de Dokploy:

- `qpass.tudominio.com` → servicio **frontend**, puerto **80**

El backend NO necesita dominio: el nginx del frontend recibe `https://qpass.tudominio.com/api/...`
y lo proxya al backend por la red interna de Docker. Mismo origen → sin CORS.

> `VITE_API_URL` se deja en `/api` (relativo). Si algún día tenés un subdominio
> aparte para el API, ponés ahí la URL absoluta y sacás el `location /api/` del nginx.

## 2. Crear la app en Dokploy

1. **Create Application → Compose**.
2. Fuente: este repositorio, rama a desplegar. Compose Path: `docker-compose.yml`.
3. Pestaña **Environment**: pegá el contenido de `.env.example` y completá:
   - `POSTGRES_PASSWORD` — clave fuerte, solo `[A-Za-z0-9_-]`.
   - `JWT_SECRET` — mínimo 16 caracteres (`openssl rand -base64 32`).
   - `VITE_API_URL=/api` y `CORS_ORIGEN=*` quedan así.
4. Pestaña **Domains**, agregá **una**:
   - Service `frontend`, Container Port `80`, Host `qpass.tudominio.com`, HTTPS on.
5. **Deploy**.

## 3. Qué pasa en el arranque

- `db` levanta y espera a estar *healthy* (`pg_isready`).
- `backend` corre `prisma migrate deploy` (aplica migraciones pendientes) y luego `node dist/main`.
- `frontend` sirve el build; `/api/*` va al backend, el resto cae en `index.html`.

> **Si el backend queda en bucle con `P1000: Authentication failed`**: el volumen
> `qpass_db_data` se creó antes con otra contraseña (Postgres solo la aplica al
> inicializar el volumen vacío). Borrá el volumen y redeploy, o alineá la clave:
> `docker compose exec db psql -U qpass -d qpass -c "ALTER USER qpass WITH PASSWORD 'LA_DEL_ENV';"`

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
aplican solas. El frontend se reconstruye en cada deploy (build arg horneado por Vite).

## 6. Redis / colas de correo

Hoy no se usa (`MailService` solo loguea). Cuando se active BullMQ: agregá un servicio
`redis:7-alpine` al compose en la red `internal` y seteá `REDIS_URL=redis://redis:6379`.
