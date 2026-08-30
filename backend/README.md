# QPass API — Backend (NestJS)

API REST de QPass: eventos, entradas con QR, billetera personal (ledger) y
puestos/ventas. **NestJS + Prisma + PostgreSQL**, monolito modular en capas con
patrón Ledger para el dinero (Anexo C).

> Migrado desde el backend Express de `../backend/`. El **contrato con el
> frontend no cambia**: mismas rutas, mismos cuerpos JSON crudos y el mismo body
> de error `{ error: "mensaje" }` (regla C0). Ver "Desviaciones" abajo.

## Stack

- **NestJS 10** (Express por debajo) · **Prisma 6** · **PostgreSQL 16**
- **JWT** (passport-jwt) · **class-validator** para DTOs
- **@nestjs/schedule** para los crons · Redis/BullMQ: pendiente (ver abajo)

## Requisitos

- Node 20+ (probado con Node 22/24)
- Docker (para Postgres y Redis)

## Cómo levantarlo

```bash
cp .env.example .env          # ajustá JWT_SECRET (usá el mismo que ../backend/.env)
docker compose up -d          # postgres (5433) + redis (6379)
npm install
npx prisma migrate deploy     # aplica prisma/migrations sobre la BD "qpass"
npm run prisma:seed           # 8 usuarios de prueba, password "123456"
npm run start:dev             # http://localhost:4000
```

Usa la **misma base `qpass`** que el backend Express: lo reemplaza. Solo puede
escuchar uno a la vez en el puerto 4000. La migración `..._anexo_c_idempotencia_qr_index`
(tabla `solicitudes_idempotentes` + índice único parcial de `codigos_qr`) es la única
que este backend agrega sobre el schema que ya existía.

`GET http://localhost:4000/health` → `{ "ok": true }`.

## Variables de entorno

| Variable | Qué hace |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL (coincide con docker-compose, puerto 5433). |
| `REDIS_URL` | Solo para BullMQ (colas). Opcional hoy: la app arranca sin Redis. |
| `JWT_SECRET` | Secreto de firma del JWT (mín. 16 caracteres). |
| `JWT_EXPIRA_EN` | Expiración del token (`8h` por defecto). |
| `SMTP_*` | Correo saliente. Hoy `MailService` solo loguea, no envía. |
| `PORT` | Puerto del servidor (`4000` = lo que espera `VITE_API_URL` del frontend). |
| `CORS_ORIGEN` | Origen permitido (Vite dev = `http://localhost:5173`). Vacío/`*` = todos. |

`src/config/env.validation.ts` valida todo esto al arrancar (zod): si falta algo,
la app no levanta.

## Estructura de `src/`

```
src/
├── main.ts                 bootstrap (body parser 10mb, CORS, ValidationPipe)
├── app.module.ts           importa todos los módulos + guards/filtro/interceptor globales
├── config/                 validación de .env (zod)
├── prisma/                 PrismaService único y global (C5)
├── common/                 guards (JWT + roles), @Publico/@Roles/@Idempotente,
│                           filtro de error único, interceptor de idempotencia, utils
├── modules/<recurso>/      un módulo por recurso del schema (module + controller
│                           + service + dto/). 1 a 1 con frontend/src/api/index.js
│   └── transacciones/      ★ EL LEDGER: único que escribe Usuario.saldo (C7)
├── jobs/                   crons: finalizar-eventos, reconciliacion-saldo, limpiar-idempotencia
└── mail/                   MailService (stub: loguea, no envía)
```

## Reglas clave del Anexo C aplicadas

- **Controller → Service → PrismaService.** El controller no tiene lógica de negocio.
- **Dinero y cupos: `UPDATE` atómico condicional dentro de `$transaction`.**
  Nunca leer-calcular-escribir. Ver `transacciones.service.ts` (saldo) y
  `compras.service.ts` (cupo de `CategoriaTicket`, `$executeRaw`).
- **`TransaccionesService` es el único que escribe `Usuario.saldo`.** `VentasService`
  e `IncidenciasRecargaService` le pasan su `tx` para no romper la atomicidad.
- **Índice único parcial** `codigos_qr (entradaId) WHERE anulado = false` — refuerza
  en la BD "un solo QR activo por entrada" (migración `..._anexo_c_idempotencia_qr_index`).
- **Idempotencia** (`@Idempotente()` + header `Idempotency-Key`) en
  `POST /transacciones/recarga`, `/transacciones/devolucion` y `POST /ventas`.
- **Un solo formato de error**, vía `ExcepcionHttpFilter` global.
- **Efectos secundarios después del commit**: hoy no hay correos reales; cuando los
  haya, van en cola BullMQ, nunca dentro de un `$transaction`.

## Desviaciones documentadas respecto al Anexo C

1. **Body de error `{ error }`** en vez de `{ status, mensaje }`: el frontend real
   (`frontend/src/api/client.js`) lee `data.error`. Mantener el frontend intacto
   (C0) manda sobre la forma literal del Anexo.
2. **Sin interceptor `{ data, meta }`**: el frontend consume el JSON crudo.
3. **`ValidationPipe` sin `forbidNonWhitelisted`**: solo `whitelist` (descarta
   props extra en silencio, como hacía Express). Activar `forbidNonWhitelisted`
   rompería llamadas del frontend que mandan campos de más.
4. **BullMQ + eventos de dominio (C11/C12)**: pendientes. Hoy los 3 crons cubren lo
   asíncrono; `MailService` es un stub. C12 el propio anexo lo marca opcional.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | Servidor con watch |
| `npm run build` | Compila a `dist/` |
| `npm run lint` | ESLint + Prettier |
| `npm test` | Unit tests (jest) |
| `npm run test:e2e` | Tests e2e (requiere BD levantada) |
| `npm run prisma:studio` | Prisma Studio |
| `npm run prisma:migrate` | `prisma migrate dev` |
