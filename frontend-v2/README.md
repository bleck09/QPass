# QPass — Frontend (React + Vite + TypeScript)

Interfaz de QPass: landing pública, compra de entradas, billetera y paneles por
rol (admin, cliente, recargador, supervisor, devolución, negocio, ayudante,
usuario). Sigue el **Manual UI/UX 2026**, el **Anexo A** (color) y el **Anexo B**
(arquitectura).

> Reescritura del `../frontend/` (JS, por rol) al modelo del Anexo B (TS, por
> feature). Consume el backend NestJS de `../backend-nest`.

## Stack

- **React 19 + Vite 6 + TypeScript** (strict)
- **TanStack Query** para estado del servidor · **axios** (cliente único)
- **react-hook-form + zod** para formularios
- **react-router-dom 7**
- CSS Modules + `styles/tokens.css` (paleta OKLCH del Anexo A, tema claro/oscuro)

## Cómo levantarlo

```bash
cp .env.example .env.local
npm install
npm run dev            # http://localhost:5173
```

Requiere el backend corriendo en `http://localhost:4000` (`../backend-nest`,
`npm run start:dev`). Usuarios de prueba (seed del backend): `admin@qpass.com`
… `ayudante@qpass.com`, contraseña `123456`.

## Variables de entorno

| Variable | Qué hace |
|---|---|
| `VITE_API_URL` | URL base del backend. Sin barra final. |
| `VITE_APP_NOMBRE` | Nombre visible de la app. |
| `VITE_DEBUG` | `true` activa logs detallados. |

## Estructura de `src/`

```
src/
├── main.tsx / App.tsx        monta la app + providers + router
├── app/                      router, providers, guards (RutaPrivada, RutaPorRol)
├── pages/                    una carpeta por pantalla — SOLO componen
├── features/<dominio>/       el corazón: components, hooks, services, types, schemas
│   └── auth/                 (hecho) login, registro, recuperar, sesión
├── shared/                   reutilizable por todas las features
│   ├── components/ui/        Button, Input, Modal, Table, Badge, Alert, Card...
│   ├── components/feedback/  EstadoCargando / EstadoVacio / EstadoError
│   ├── components/layout/    AppLayout, Sidebar, Header
│   ├── hooks/ utils/ constants/ types/
├── lib/                      api (client + endpoints + errors), config, storage, queryClient
└── styles/                   tokens.css, reset.css, global.css
```

## Reglas aplicadas

- **Componente → hook → servicio → cliente HTTP.** Cero `fetch`/`axios` en componentes.
- Todas las URLs del backend en `lib/api/endpoints.ts`.
- Un formato de error único (`ApiError`), token adjuntado por interceptor.
- Color: **1 primario (teal 195°)** + grises tintados + 4 semánticos fijos.
  Tokens de 3 niveles; los componentes nunca usan `--teal-500` directo.
- Los 7 estados interactivos y los estados vacío/carga/error en cada lista.
- Foco visible siempre, `<dialog>` nativo para modales, mobile-first.

## Estado de la migración

Completo. Todas las features y pantallas de rol implementadas:

| Feature | Pantallas |
|---|---|
| auth | login, registro, recuperar (2 pasos) |
| usuarios / perfil | `/perfil`, `/admin/usuarios` |
| eventos | `/admin/eventos`, `/admin/eventos/:id` (tabs) |
| solicitudes-evento | `/cliente`, `/admin/solicitudes` |
| categorias-ticket · codigos-qr · asignaciones · landing-config | paneles dentro de `/admin/eventos/:id` (QR → PDF imprimible) |
| compras | `/usuario` (comprar + mis compras), `/admin/compras` (aprobar/rechazar) |
| entradas | escáner QR + captura de foto; `/supervisor` (control de acceso + entregar manillas) |
| transacciones | `/recargador` (recarga, idempotente), `/devolucion` (retiro con foto de carnet) |
| incidencias | reporte desde `/recargador`, resolución en `/admin/incidencias` |
| reportes-entrada | reporte desde `/usuario`, corrección en `/admin/reportes` |
| puestos · productos · ventas | `/negocio` (puestos, productos, alta de ayudantes), `/ayudante` (cobrar) |
| landing pública | `/evento/:id` (colores del organizador) |
| panel | `/admin` (resumen de pendientes) |

Pendiente de pulido: mapa de puestos (x/y), historial de transacciones por
operador (el backend no expone ese filtro), lazy-loading de rutas para bajar el
bundle inicial.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción |
| `npm run typecheck` | Solo chequeo de tipos |
| `npm run lint` | ESLint + Prettier |
