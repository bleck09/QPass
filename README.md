# QPass

Sistema de gestión de eventos con entradas, códigos QR y control de acceso.

## Estructura

- [frontend/](frontend/) — React + Vite (SPA). Ver [frontend/README.md](frontend/README.md).
- [backend/](backend/) — API REST con Node.js + Express + Prisma + PostgreSQL.

## Desarrollo

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
cp .env.example .env   # completar DATABASE_URL y JWT_SECRET
npm run prisma:migrate
npm run start:dev
```

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
