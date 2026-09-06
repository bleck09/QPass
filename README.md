# QPass

Sistema de gestión de eventos con entradas, códigos QR y control de acceso.

## Estructura

- [frontend/](frontend/) — React + Vite (SPA). Ver [frontend/README.md](frontend/README.md).
- [backend/](backend/) — API REST con NestJS + Prisma + PostgreSQL. Ver [backend/README.md](backend/README.md).
- [docker-compose.yml](docker-compose.yml) — stack de **producción** (Dokploy): db + backend + frontend + MinIO.
- [backend/docker-compose.yml](backend/docker-compose.yml) — dependencias para **desarrollo local**: Postgres + Redis + MinIO.

Las imágenes (fotos, comprobantes, logos, portadas...) se guardan como objetos en
**MinIO** (S3 compatible), tanto en local como en producción. La BD solo guarda la
URL `/uploads/...`; el backend las sube y las sirve. Ver
[backend/src/modules/uploads/](backend/src/modules/uploads/).

## Desarrollo local

Necesitás Node 20+ y Docker.

```bash
# 1. Infra: Postgres (5433) + Redis (6379) + MinIO (9000 API / 9001 consola)
cd backend
docker compose up -d

# 2. Backend
cp .env.example .env          # ajustá JWT_SECRET; el resto ya apunta a la infra de arriba
npm install
npm run prisma:deploy         # aplica migraciones sobre la BD "qpass"
npm run prisma:seed           # 8 usuarios de prueba, password "123456"
npm run start:dev             # http://localhost:4000  (GET /health -> { ok: true })

# 3. Frontend (otra terminal)
cd ../frontend
npm install
npm run dev                   # http://localhost:5173
```

Usuarios del seed: `admin@qpass.com`, `cliente@qpass.com`, `supervisor@qpass.com`,
etc. — todos con contraseña `123456`.
Consola de MinIO: http://localhost:9001 (usuario `qpass-minio` / clave `qpass-minio-secret`).

## Producción (Dokploy)

El stack completo vive en [docker-compose.yml](docker-compose.yml) (app tipo **Compose**).
Un solo dominio: el nginx del `frontend` sirve la SPA y proxya `/api` y `/uploads`
al `backend` por la red interna.

1. **Environment** (pestaña de Dokploy): cargar las variables de
   [.env.example](.env.example) con valores reales. Las de imágenes:
   `S3_ACCESS_KEY`, `S3_SECRET_KEY` (largo, sin espacios: `openssl rand -hex 24`),
   `S3_BUCKET`, `S3_REGION`. `S3_ENDPOINT` lo fija el compose.
2. **Domains**: uno solo → service `frontend`, puerto `80`.
3. Push a la rama que Dokploy despliega → redeploy. Orden de arranque:
   `db` + `minio` → `minio-init` (crea el bucket) → `backend` (migra y arranca) → `frontend`.

`minio-init` queda en `Exited (0)`: es un job de un solo uso, es lo esperado.

### Backups

Una copia completa = **volumen `qpass_minio_data`** (imágenes) + **dump de la BD**,
del mismo momento. El backup de Postgres se configura en la sección Backups de
Dokploy; para el volumen de MinIO, la función de Volume Backups o un `mc mirror`
a un bucket externo (Backblaze B2 / Cloudflare R2).

## Reglas de negocio (decisiones, NO cambiar sin querer)

Constantes de negocio dispersas en el código. Si tocás una, revisá la otra copia.

### Control de acceso en puerta (ingreso/salida de QR)

- **INGRESO**: solo se registra desde **3 h antes** de `evento.fecha` (inicio) y
  hasta `evento.fechaFin` (cierre). Si `evento.estado === 'finalizado'` o ya pasó
  `fechaFin`, se rechaza.
- **SALIDA**: **sin ventana de tiempo**. Si la entrada está `ingresado`, siempre se
  puede registrar la salida — incluso con el evento ya finalizado (para poder
  desalojar el recinto).
- Margen configurable: `MARGEN_INGRESO_ANTICIPADO_HORAS`
  - backend: `backend/src/modules/entradas/entradas.service.ts`
  - frontend (solo aviso en UI): `frontend/src/pages/supervisor/Supervisor.jsx`
  - **ambos valores deben coincidir.**

### Compra de entradas

- **Máx. entradas por compra**: `6`. Debe coincidir en:
  - backend: `MAX_ENTRADAS_POR_COMPRA` en `backend/src/modules/compras/compras.service.ts`
  - frontend: `MAX_ENTRADAS` en `frontend/src/pages/usuario-normal/UsuarioNormal.jsx`
- No se puede comprar si el evento está `finalizado`, ni con categorías que no
  pertenezcan a ese evento.
- El cupo por categoría se reserva de forma atómica al crear la compra
  (`cantidadVendida` cuenta pendientes + confirmadas; se libera al rechazar).
- `Entrada.numero`: correlativo **por evento**, visible para el asistente. Se
  asigna al **aprobar** la compra (`ComprasService.aprobar`).

### Asignaciones a eventos

- El **rol de un usuario dentro de un evento es siempre su rol de cuenta**
  (`Usuario.rol`). No se elige aparte: `AsignacionesService.asignar` lo deriva y
  rechaza cuentas de rol no operativo (Admin / UsuarioNormal / Ayudante).
- Sin fila en `asignaciones_eventos`, el operador **no ve** ese evento en su panel
  (`GET /asignaciones?usuarioId=&rol=` filtra por ambos).
