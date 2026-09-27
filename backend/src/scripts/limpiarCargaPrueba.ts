import prisma from '../lib/prisma';

/**
 * Elimina las matrículas creadas por las pruebas de carga de JMeter
 * (nombres "CARGA", apellidos "PRUEBA") y sus usuarios asociados.
 *
 * Uso:
 *   npx ts-node src/scripts/limpiarCargaPrueba.ts            → DRY-RUN (solo cuenta, no borra)
 *   npx ts-node src/scripts/limpiarCargaPrueba.ts --confirm  → BORRA de verdad
 *
 * IMPORTANTE: apunta a la base indicada por DATABASE_URL. Para limpiar
 * producción, ejecútalo con la DATABASE_URL de Railway (p. ej. `railway run ...`).
 */
async function main() {
  const confirm = process.argv.includes('--confirm');

  const objetivo = await prisma.matricula.findMany({
    where: {
      nombres: { equals: 'CARGA', mode: 'insensitive' },
      apellidos: { equals: 'PRUEBA', mode: 'insensitive' }
    },
    select: { id: true, usuarioId: true, cedula: true, cursoId: true }
  });

  console.log(`\nMatrículas de carga encontradas ("CARGA PRUEBA"): ${objetivo.length}`);
  if (objetivo.length > 0) {
    console.log('Ejemplos:', objetivo.slice(0, 5));
  }

  if (objetivo.length === 0) {
    console.log('Nada que borrar.');
    await prisma.$disconnect();
    return;
  }

  if (!confirm) {
    console.log('\n[DRY-RUN] No se borró nada. Vuelve a ejecutar con --confirm para eliminar.');
    await prisma.$disconnect();
    return;
  }

  const matriculaIds = objetivo.map((m) => m.id);
  const usuarioIds = objetivo.map((m) => m.usuarioId);

  // Borrar matrículas: la cascada elimina datos personales/familiares/académicos,
  // notas, supletorios, disciplina, exámenes, asistencias y entregas asociadas.
  const delM = await prisma.matricula.deleteMany({ where: { id: { in: matriculaIds } } });
  // Los usuarios quedan huérfanos tras borrar su matrícula: eliminarlos también.
  const delU = await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });

  console.log(`\n✅ Eliminadas ${delM.count} matrículas y ${delU.count} usuarios de prueba.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
