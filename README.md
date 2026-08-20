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
npm run dev
```
