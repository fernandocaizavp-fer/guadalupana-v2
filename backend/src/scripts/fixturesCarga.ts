import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Crea datos mínimos de prueba en la base LOCAL para las corridas JMeter:
 *  - un curso de prueba (para POST /api/matriculas)
 *  - una materia + una tarea (para POST /api/tareas/notas)
 *  - una matrícula/estudiante de prueba (para notas y asistencia)
 *
 * Idempotente: si ya existen, los reutiliza. Imprime los IDs para configurar
 * las variables de los .jmx (CURSO_ID, MATERIA_ID, TAREA_ID, MATRICULA_ID).
 */
async function main() {
  // 1) Curso de prueba
  let curso = await prisma.curso.findFirst({ where: { ramaArtesanal: 'CARGA PRUEBA' } });
  if (!curso) {
    curso = await prisma.curso.create({
      data: {
        ramaArtesanal: 'CARGA PRUEBA',
        anioFormativo: '1',
        fechaInicio: new Date('2026-01-01'),
        fechaFin: new Date('2026-12-31')
      }
    });
  }

  // 2) Materia de prueba
  let materia = await prisma.materia.findFirst({ where: { cursoId: curso.id, nombre: 'Materia Prueba' } });
  if (!materia) {
    materia = await prisma.materia.create({
      data: { nombre: 'Materia Prueba', cursoId: curso.id, esSubmateria: false }
    });
  }

  // 3) Tarea de prueba
  let tarea = await prisma.tarea.findFirst({ where: { materiaId: materia.id, nombre: 'Tarea Prueba' } });
  if (!tarea) {
    tarea = await prisma.tarea.create({
      data: { nombre: 'Tarea Prueba', fecha: new Date('2026-03-01'), semestre: 1, materiaId: materia.id }
    });
  }

  // 4) Estudiante + matrícula de prueba
  const hash = await bcrypt.hash('prueba123', 10);
  const usuario = await prisma.usuario.upsert({
    where: { correo: 'matricula.prueba@local.test' },
    update: {},
    create: {
      nombre: 'Matricula', apellido: 'Prueba',
      correo: 'matricula.prueba@local.test',
      password: hash, rol: 'ESTUDIANTE'
    }
  });

  let matricula = await prisma.matricula.findFirst({ where: { cedula: '0000000001' } });
  if (!matricula) {
    matricula = await prisma.matricula.create({
      data: {
        matriculaNo: 'MP-0001',
        apellidos: 'PRUEBA', nombres: 'MATRICULA',
        cedula: '0000000001',
        cursoId: curso.id,
        usuarioId: usuario.id
      }
    });
  }

  console.log('\n===== FIXTURES LISTOS (base local) =====');
  console.log(`CURSO_ID      = ${curso.id}   (para prueba 01 - matriculas)`);
  console.log(`MATERIA_ID    = ${materia.id}   (para prueba 03 - asistencia)`);
  console.log(`TAREA_ID      = ${tarea.id}   (para prueba 02 - notas)`);
  console.log(`MATRICULA_ID  = ${matricula.id}   (para pruebas 02 y 03)`);
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
