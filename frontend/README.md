# QPass — Frontend (React + Vite)

SPA de QPass: landing pública, login y paneles por rol (Admin, Cliente,
Recargador, Supervisor, Devolución, Usuario Normal, Usuario Negocio, Ayudante).
React 19 + React Router + Vite. Sin TypeScript.

## Desarrollo local

Necesita el backend corriendo en `http://localhost:4000` (ver
[../backend/README.md](../backend/README.md)).

```bash
npm install
npm run dev        # http://localhost:5173
```

El cliente HTTP ([src/api/client.js](src/api/client.js)) usa
`import.meta.env.VITE_API_URL` y, si no está, cae en `http://localhost:4000`. Para
desarrollo normal no hace falta configurar nada. Si querés forzarlo, creá un
`.env`:

```
VITE_API_URL=http://localhost:4000
```

La sesión (token JWT + datos del usuario) se guarda en `localStorage` bajo la
clave `usuarioProyectoIngresos`. Cualquier respuesta `401` del backend la borra y
redirige a `/login`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve el `dist/` ya compilado |
| `npm run lint` | ESLint |

## Producción

Se construye y se sirve dentro de un contenedor ([Dockerfile](Dockerfile)):

1. **Build**: `vite build` con `VITE_API_URL` como *build arg* (Vite hornea las
   `VITE_*` en el bundle, no se leen en runtime). Por defecto `/api`.
2. **Runtime**: nginx ([nginx.conf](nginx.conf)) sirve el estático y hace de proxy
   en el mismo dominio:
   - `/api/*` → `http://qpass-backend:4000/*` (le saca el prefijo `/api`).
   - `/uploads/*` → `http://qpass-backend:4000/uploads/*` (conserva el prefijo y
     el query `?exp=&firma=` con el que el backend valida la firma de cada imagen).
   - cualquier otra ruta → `index.html` (React Router).

Todo el stack de producción está en [../docker-compose.yml](../docker-compose.yml)
(Dokploy). Un solo dominio apunta al service `frontend`, puerto `80`.
