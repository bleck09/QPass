// Uso único: antes de este fix, Entrada.foto nunca se escribía — la foto de la primera vez
// que alguien pasaba por control solo quedaba guardada en RegistroIngreso. Este script rellena
// Entrada.foto con la foto del RegistroIngreso más antiguo que tenga una, para las entradas que
// ya tienen historial de control pero todavía no tienen Entrada.foto. No borra ni sobrescribe
// nada — solo completa el campo cuando está vacío.
import { prisma } from '../src/lib/prisma.js';

const entradasSinFoto = await prisma.entrada.findMany({
  where: { foto: null },
  select: { id: true },
});

let actualizadas = 0;
for (const { id } of entradasSinFoto) {
  const primerRegistroConFoto = await prisma.registroIngreso.findFirst({
    where: { entradaId: id, foto: { not: null } },
    orderBy: { createdAt: 'asc' },
  });
  if (primerRegistroConFoto) {
    await prisma.entrada.update({ where: { id }, data: { foto: primerRegistroConFoto.foto } });
    actualizadas++;
  }
}

console.log(`Entradas revisadas: ${entradasSinFoto.length}. Entradas actualizadas con foto: ${actualizadas}.`);
await prisma.$disconnect();
