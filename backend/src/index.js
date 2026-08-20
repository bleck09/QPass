import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { usuariosRouter } from './routes/usuarios.routes.js';
import { eventosRouter } from './routes/eventos.routes.js';
import { asignacionesRouter } from './routes/asignaciones.routes.js';
import { entradasRouter } from './routes/entradas.routes.js';
import { codigosQrRouter } from './routes/codigosQr.routes.js';
import { puestosRouter } from './routes/puestos.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/usuarios', usuariosRouter);
app.use('/eventos', eventosRouter);
app.use('/asignaciones', asignacionesRouter);
app.use('/entradas', entradasRouter);
app.use('/codigos-qr', codigosQrRouter);
app.use('/puestos', puestosRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`QPass API escuchando en http://localhost:${PORT}`));
