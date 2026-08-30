import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, Rol } from '@prisma/client';

const prisma = new PrismaClient();

const USUARIOS_SEED: Array<{ rol: Rol; nombre: string; email: string }> = [
  { rol: 'Admin', nombre: 'Carlos Admin', email: 'admin@qpass.com' },
  { rol: 'Cliente', nombre: 'Erick Cliente', email: 'cliente@qpass.com' },
  { rol: 'Recargador', nombre: 'Juan Recargador', email: 'recargador@qpass.com' },
  { rol: 'Supervisor', nombre: 'Ana Supervisor', email: 'supervisor@qpass.com' },
  { rol: 'Devolucion', nombre: 'Luis Devoluciones', email: 'devolucion@qpass.com' },
  { rol: 'UsuarioNormal', nombre: 'Pedro Normal', email: 'normal@qpass.com' },
  { rol: 'UsuarioNegocio', nombre: 'Maria Negocio', email: 'negocio@qpass.com' },
  { rol: 'Ayudante', nombre: 'Jose Ayudante', email: 'ayudante@qpass.com' },
];

const PASSWORD = '123456';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const usuario of USUARIOS_SEED) {
    await prisma.usuario.upsert({
      where: { email: usuario.email },
      update: {},
      create: { ...usuario, passwordHash },
    });
  }

  console.log(`Seed listo: ${USUARIOS_SEED.length} usuarios (password para todos: "${PASSWORD}")`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
