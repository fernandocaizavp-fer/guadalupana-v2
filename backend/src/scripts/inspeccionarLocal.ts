import prisma from '../lib/prisma';

async function main() {
  const admins = await prisma.usuario.findMany({
    where: { rol: 'ADMIN' },
    select: { id: true, correo: true, nombre: true, apellido: true }
  });

  const cursos = await prisma.curso.findMany({
    select: { id: true, ramaArtesanal: true, anioFormativo: true },
    orderBy: { id: 'asc' }
  });

  const totalMatriculas = await prisma.matricula.count();
  const carga = await prisma.matricula.count({
    where: { nombres: { equals: 'CARGA', mode: 'insensitive' }, apellidos: { equals: 'PRUEBA', mode: 'insensitive' } }
  });

  const totalTareas = await prisma.tarea.count();
  const tareasEjemplo = await prisma.tarea.findMany({
    take: 5,
    orderBy: { id: 'asc' },
    select: { id: true, nombre: true, semestre: true, materia: { select: { id: true, nombre: true, cursoId: true } } }
  });

  // Detalle del curso 2 (el que usa la prueba 01)
  const curso2 = await prisma.curso.findUnique({
    where: { id: 2 },
    select: {
      id: true, ramaArtesanal: true,
      materias: { select: { id: true, nombre: true, esSubmateria: true } },
      matriculas: { take: 3, select: { id: true, nombres: true, apellidos: true } }
    }
  });

  console.log('\n===== ADMINS =====');
  console.log(admins.length ? admins : 'NINGUNO');
  console.log('\n===== CURSOS =====');
  console.log(cursos.length ? cursos : 'NINGUNO');
  console.log('\n===== MATRICULAS =====');
  console.log(`Total: ${totalMatriculas} | "Carga Prueba": ${carga}`);
  console.log('\n===== TAREAS =====');
  console.log(`Total: ${totalTareas}`);
  console.log(tareasEjemplo);
  console.log('\n===== CURSO id=2 (usado por prueba 01) =====');
  console.log(curso2 ? {
    id: curso2.id,
    rama: curso2.ramaArtesanal,
    materias: curso2.materias.length,
    materiasEjemplo: curso2.materias.slice(0, 5),
    matriculasEjemplo: curso2.matriculas
  } : 'NO EXISTE curso id=2');

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
