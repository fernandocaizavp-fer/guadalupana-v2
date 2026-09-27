import prisma from '../lib/prisma';

// Este script elimina PERMANENTEMENTE una matrícula y su usuario asociado.
// Úsalo con cuidado solo para limpiar datos de prueba o basura.

async function limpiarMatricula(matriculaId: number) {
  if (isNaN(matriculaId)) {
    console.error('Error: Debes proporcionar un ID de matrícula válido.');
    process.exit(1);
  }

  console.log(`Iniciando limpieza para la matrícula ID: ${matriculaId}...`);

  try {
    // 1. Encontrar la matrícula para obtener el ID del usuario asociado.
    const matricula = await prisma.matricula.findUnique({
      where: { id: matriculaId },
      select: { usuarioId: true }
    });

    if (!matricula) {
      console.error(`Error: No se encontró ninguna matrícula con el ID ${matriculaId}.`);
      process.exit(1);
    }

    const { usuarioId } = matricula;

    // 2. Ejecutar el borrado en una transacción para asegurar la integridad.
    // Prisma se encargará de borrar en cascada los datos relacionados
    // (DatosPersonales, Notas, Asistencias, etc.) gracias al `onDelete: Cascade`
    // definido en el schema.prisma.
    // El orden es importante: primero la matrícula, luego el usuario.
    await prisma.$transaction(async (tx) => {
      console.log(`- Eliminando registro de matrícula ID: ${matriculaId}...`);
      await tx.matricula.delete({ where: { id: matriculaId } });

      console.log(`- Eliminando registro de usuario ID: ${usuarioId}...`);
      await tx.usuario.delete({ where: { id: usuarioId } });
    });

    console.log('✅ Limpieza completada exitosamente.');
    console.log(`La cédula y el correo asociados al usuario ID ${usuarioId} han sido liberados.`);

  } catch (error: any) {
    console.error('❌ Ocurrió un error durante la limpieza:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener el ID de la matrícula desde los argumentos de la línea de comandos
const matriculaIdArg = process.argv[2];
limpiarMatricula(parseInt(matriculaIdArg, 10));
