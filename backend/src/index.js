import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { usuariosRouter } from './routes/usuarios.routes.js';
import { eventosRouter } from './routes/eventos.routes.js';
import { asignacionesRouter } from './routes/asignaciones.routes.js';
import { categoriasTicketRouter } from './routes/categoriasTicket.routes.js';
import { comprasRouter } from './routes/compras.routes.js';
import { entradasRouter } from './routes/entradas.routes.js';
import { codigosQrRouter } from './routes/codigosQr.routes.js';
import { transaccionesRouter } from './routes/transacciones.routes.js';
import { incidenciasRouter } from './routes/incidencias.routes.js';
import { reportesEntradaRouter } from './routes/reportesEntrada.routes.js';
import { puestosRouter } from './routes/puestos.routes.js';
import { productosRouter } from './routes/productos.routes.js';
import { puestoAyudantesRouter } from './routes/puestoAyudantes.routes.js';
import { ventasRouter } from './routes/ventas.routes.js';
import { landingConfigRouter } from './routes/landingConfig.routes.js';
import { propuestaLandingRouter } from './routes/propuestaLanding.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/usuarios', usuariosRouter);
app.use('/eventos', eventosRouter);
app.use('/asignaciones', asignacionesRouter);
app.use('/categorias-ticket', categoriasTicketRouter);
app.use('/compras', comprasRouter);
app.use('/entradas', entradasRouter);
app.use('/codigos-qr', codigosQrRouter);
app.use('/transacciones', transaccionesRouter);
app.use('/incidencias', incidenciasRouter);
app.use('/reportes-entrada', reportesEntradaRouter);
app.use('/puestos', puestosRouter);
app.use('/productos', productosRouter);
app.use('/puesto-ayudantes', puestoAyudantesRouter);
app.use('/ventas', ventasRouter);
app.use('/landing-config', landingConfigRouter);
app.use('/propuesta-landing', propuestaLandingRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`QPass API escuchando en http://localhost:${PORT}`));
