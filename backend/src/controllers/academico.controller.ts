import { Response } from 'express';
import prisma from '../lib/prisma';
import { calcularDisciplinaPonderada } from '../lib/disciplina';

// Tope de filas por petición de programación (un curso tiene pocas decenas de
// materias; esto solo evita cargas abusivas).
const MAX_PROGRAMACION = 200;

const DOCENTE_SELECT = { id: true, nombre: true, apellido: true, fotoUrl: true } as const;

// Las materias principales 'Práctica' y 'Teoría' son contenedores de
// submaterias: no tienen clases, tareas ni asistencia propias.
function esContenedor(materia: { nombre: string; esSubmateria: boolean }): boolean {
  return !materia.esSubmateria && (materia.nombre === 'Práctica' || materia.nombre === 'Teoría');
}

function fechaValida(valor: unknown): Date | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const fecha = new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
}

function vacio(valor: unknown): boolean {
  return valor === null || valor === undefined || valor === '';
}

// Un estudiante solo consulta lo suyo; el administrador, lo de cualquiera.
function puedeVer(req: any, estudianteId: number): boolean {
  return req.usuario.rol === 'ADMIN' || Number(req.usuario.id) === estudianteId;
}

function porcentaje(presentes: number, total: number): number | null {
  return total > 0 ? Math.round((presentes / total) * 100) : null;
}

// Matrícula activa del estudiante con las materias activas de su curso.
function matriculaConMaterias(usuarioId: number) {
  return prisma.matricula.findUnique({
    where: { usuarioId },
    select: {
      id: true,
      activo: true,
      curso: {
        select: {
          id: true,
          ramaArtesanal: true,
          anioFormativo: true,
          materias: {
            where: { activo: true },
            orderBy: { nombre: 'asc' },
            select: {
              id: true,
              nombre: true,
              esSubmateria: true,
              materiaParent: true,
              fechaInicio: true,
              fechaFin: true,
              horasTotales: true,
              profesor: { select: DOCENTE_SELECT },
              profesorPrincipal: { select: DOCENTE_SELECT }
            }
          }
        }
      }
    }
  });
}

// Asistencia del estudiante agrupada por materia: { materiaId → { total, presentes, faltas[] } }.
async function asistenciaPorMateria(matriculaId: number) {
  const detalles = await prisma.asistenciaDetalle.findMany({
    where: { matriculaId },
    select: { presente: true, asistencia: { select: { materiaId: true, fecha: true } } }
  });
  const mapa = new Map<number, { total: number; presentes: number; faltas: Date[] }>();
  for (const d of detalles) {
    const actual = mapa.get(d.asistencia.materiaId) || { total: 0, presentes: 0, faltas: [] };
    actual.total++;
    if (d.presente) actual.presentes++;
    else actual.faltas.push(d.asistencia.fecha);
    mapa.set(d.asistencia.materiaId, actual);
  }
  return mapa;
}

// ---------- ADMINISTRADOR: PROGRAMACIÓN ACADÉMICA ----------

// GET /api/academico/cursos/:id/materias — solo ADMIN
// Materias programables del curso (materias normales y submaterias) con sus
// fechas, horas y docente actuales.
export const getMateriasCurso = async (req: any, res: Response) => {
  const cursoId = Number(req.params.id);
  if (!Number.isInteger(cursoId)) {
    return res.status(400).json({ error: 'Identificador de curso inválido' });
  }

  try {
    const curso = await prisma.curso.findUnique({
      where: { id: cursoId },
      select: {
        id: true,
        ramaArtesanal: true,
        anioFormativo: true,
        fechaInicio: true,
        fechaFin: true,
        materias: {
          where: { activo: true },
          orderBy: [{ esSubmateria: 'asc' }, { materiaParent: 'asc' }, { nombre: 'asc' }],
          select: {
            id: true,
            nombre: true,
            esSubmateria: true,
            materiaParent: true,
            fechaInicio: true,
            fechaFin: true,
            horasTotales: true,
            profesorId: true
          }
        }
      }
    });
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    res.json({
      ...curso,
      materias: curso.materias.filter((m) => !esContenedor(m) && m.nombre !== 'Disciplina')
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las materias del curso' });
  }
};

// POST /api/academico/programacion — solo ADMIN
// Recibe un array [{ materiaId, fechaInicio, fechaFin, horasTotales, docenteId }]
// y guarda la programación de cada materia en una sola transacción. Los campos
// vacíos se guardan como "sin definir".
export const guardarProgramacion = async (req: any, res: Response) => {
  const entrada = req.body;
  if (!Array.isArray(entrada) || entrada.length === 0) {
    return res.status(400).json({ error: 'Se esperaba un arreglo con la programación de materias' });
  }
  if (entrada.length > MAX_PROGRAMACION) {
    return res.status(400).json({ error: `No se pueden programar más de ${MAX_PROGRAMACION} materias a la vez` });
  }

  const filas = [];
  const vistos = new Set<number>();
  for (let i = 0; i < entrada.length; i++) {
    const item = entrada[i] ?? {};
    const n = i + 1;
    const materiaId = Number(item.materiaId);
    if (!Number.isInteger(materiaId)) {
      return res.status(400).json({ error: `Fila ${n}: la materia es obligatoria` });
    }
    if (vistos.has(materiaId)) {
      return res.status(400).json({ error: `Fila ${n}: la materia está repetida` });
    }
    vistos.add(materiaId);

    const fechaInicio = vacio(item.fechaInicio) ? null : fechaValida(item.fechaInicio);
    const fechaFin = vacio(item.fechaFin) ? null : fechaValida(item.fechaFin);
    if ((!vacio(item.fechaInicio) && !fechaInicio) || (!vacio(item.fechaFin) && !fechaFin)) {
      return res.status(400).json({ error: `Fila ${n}: fecha inválida` });
    }
    if (!!fechaInicio !== !!fechaFin) {
      return res.status(400).json({ error: `Fila ${n}: indica la fecha de inicio y la de fin, o deja ambas vacías` });
    }
    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
      return res.status(400).json({ error: `Fila ${n}: la fecha de fin debe ser posterior a la de inicio` });
    }

    const horasTotales = vacio(item.horasTotales) ? null : Number(item.horasTotales);
    if (horasTotales !== null && (!Number.isInteger(horasTotales) || horasTotales <= 0)) {
      return res.status(400).json({ error: `Fila ${n}: las horas totales deben ser un entero mayor que cero` });
    }

    const docenteId = vacio(item.docenteId) ? null : Number(item.docenteId);
    if (docenteId !== null && !Number.isInteger(docenteId)) {
      return res.status(400).json({ error: `Fila ${n}: docente inválido` });
    }

    filas.push({ materiaId, fechaInicio, fechaFin, horasTotales, docenteId });
  }

  try {
    // Existencia de las referencias, en dos consultas en vez de una por fila.
    const materiaIds = filas.map((f) => f.materiaId);
    const docenteIds = [...new Set(filas.map((f) => f.docenteId).filter((id): id is number => id !== null))];
    const [materias, docentes] = await Promise.all([
      prisma.materia.count({ where: { id: { in: materiaIds } } }),
      prisma.usuario.count({ where: { id: { in: docenteIds }, rol: 'PROFESOR', activo: true } })
    ]);
    if (materias !== materiaIds.length) {
      return res.status(400).json({ error: 'Alguna de las materias indicadas no existe' });
    }
    if (docentes !== docenteIds.length) {
      return res.status(400).json({ error: 'Alguno de los docentes indicados no existe o no está activo' });
    }

    await prisma.$transaction(
      filas.map((f) =>
        prisma.materia.update({
          where: { id: f.materiaId },
          data: {
            fechaInicio: f.fechaInicio,
            fechaFin: f.fechaFin,
            horasTotales: f.horasTotales,
            profesorId: f.docenteId
          }
        })
      )
    );
    res.json({ message: 'Programación guardada', total: filas.length });
  } catch (error) {
    console.error('Error al guardar la programación', error);
    res.status(500).json({ error: 'Error al guardar la programación' });
  }
};

// ---------- ESTUDIANTE ----------

// GET /api/academico/estudiante/:id/aula-virtual?semestre=1
// Tarjetas del aula virtual: una por materia del curso del estudiante. Las
// submaterias no salen sueltas: se agrupan bajo 'Práctica' y 'Teoría', que
// resumen sus horas, fechas y asistencia. La disciplina va aparte porque no es
// una materia: solo tiene una nota por semestre.
export const getAulaVirtual = async (req: any, res: Response) => {
  const estudianteId = Number(req.params.id);
  const semestre = Number(req.query.semestre) === 2 ? 2 : 1;
  if (!Number.isInteger(estudianteId)) {
    return res.status(400).json({ error: 'Identificador de estudiante inválido' });
  }
  if (!puedeVer(req, estudianteId)) {
    return res.status(403).json({ error: 'No autorizado para esta operación' });
  }

  try {
    const matricula = await matriculaConMaterias(estudianteId);
    if (!matricula || !matricula.activo) {
      return res.status(404).json({ error: 'El estudiante no tiene una matrícula activa' });
    }

    const [asistencia, notasDisciplina] = await Promise.all([
      asistenciaPorMateria(matricula.id),
      prisma.notaDisciplina.findMany({
        where: { matriculaId: matricula.id, semestre },
        select: {
          valor: true,
          semestre: true,
          materia: { select: { nombre: true, esSubmateria: true, materiaParent: true } }
        }
      })
    ]);

    const { materias, ...curso } = matricula.curso;
    const tarjetas = materias
      .filter((m) => !m.esSubmateria && m.nombre !== 'Disciplina')
      .map((m) => {
        if (!esContenedor(m)) {
          const a = asistencia.get(m.id);
          return {
            id: m.id,
            nombre: m.nombre,
            tieneSubmaterias: false,
            submaterias: 0,
            docente: m.profesor,
            horasTotales: m.horasTotales,
            fechaInicio: m.fechaInicio,
            fechaFin: m.fechaFin,
            asistencia: porcentaje(a?.presentes ?? 0, a?.total ?? 0)
          };
        }

        // Contenedor: resume a sus submaterias.
        const subs = materias.filter((s) => s.esSubmateria && s.materiaParent === m.nombre);
        const horas = subs.map((s) => s.horasTotales).filter((h): h is number => h !== null);
        const inicios = subs.map((s) => s.fechaInicio).filter((f): f is Date => f !== null);
        const fines = subs.map((s) => s.fechaFin).filter((f): f is Date => f !== null);
        let total = 0;
        let presentes = 0;
        for (const s of subs) {
          const a = asistencia.get(s.id);
          total += a?.total ?? 0;
          presentes += a?.presentes ?? 0;
        }
        return {
          id: m.id,
          nombre: m.nombre,
          tieneSubmaterias: true,
          submaterias: subs.length,
          docente: m.profesorPrincipal,
          horasTotales: horas.length ? horas.reduce((a, b) => a + b, 0) : null,
          fechaInicio: inicios.length ? new Date(Math.min(...inicios.map((f) => f.getTime()))) : null,
          fechaFin: fines.length ? new Date(Math.max(...fines.map((f) => f.getTime()))) : null,
          asistencia: porcentaje(presentes, total)
        };
      });

    res.json({
      curso,
      semestre,
      materias: tarjetas,
      disciplina: calcularDisciplinaPonderada(notasDisciplina)
    });
  } catch (error) {
    console.error('Error al obtener el aula virtual', estudianteId, error);
    res.status(500).json({ error: 'Error al obtener el aula virtual' });
  }
};

// GET /api/academico/estudiante/:id/asistencias
// Asistencia del estudiante por materia: clases registradas, asistencias,
// faltas (con sus fechas) y porcentaje. Solo materias con clases propias.
export const getAsistenciasEstudiante = async (req: any, res: Response) => {
  const estudianteId = Number(req.params.id);
  if (!Number.isInteger(estudianteId)) {
    return res.status(400).json({ error: 'Identificador de estudiante inválido' });
  }
  if (!puedeVer(req, estudianteId)) {
    return res.status(403).json({ error: 'No autorizado para esta operación' });
  }

  try {
    const matricula = await matriculaConMaterias(estudianteId);
    if (!matricula || !matricula.activo) {
      return res.status(404).json({ error: 'El estudiante no tiene una matrícula activa' });
    }
    const asistencia = await asistenciaPorMateria(matricula.id);

    let total = 0;
    let presentes = 0;
    const materias = matricula.curso.materias
      .filter((m) => !esContenedor(m) && m.nombre !== 'Disciplina')
      .map((m) => {
        const a = asistencia.get(m.id) || { total: 0, presentes: 0, faltas: [] as Date[] };
        total += a.total;
        presentes += a.presentes;
        return {
          id: m.id,
          nombre: m.nombre,
          grupo: m.esSubmateria ? m.materiaParent : null,
          clases: a.total,
          asistencias: a.presentes,
          faltas: a.total - a.presentes,
          porcentaje: porcentaje(a.presentes, a.total),
          fechasFaltas: a.faltas.sort((x, y) => y.getTime() - x.getTime())
        };
      });

    res.json({
      resumen: { clases: total, asistencias: presentes, faltas: total - presentes, porcentaje: porcentaje(presentes, total) },
      materias
    });
  } catch (error) {
    console.error('Error al obtener asistencias', estudianteId, error);
    res.status(500).json({ error: 'Error al obtener las asistencias' });
  }
};

// GET /api/academico/estudiante/:id/tareas-pendientes
// Tareas de su curso con fecha límite vigente que el estudiante aún no entrega
// ni tiene calificadas. Las más urgentes primero.
export const getTareasPendientes = async (req: any, res: Response) => {
  const estudianteId = Number(req.params.id);
  if (!Number.isInteger(estudianteId)) {
    return res.status(400).json({ error: 'Identificador de estudiante inválido' });
  }
  if (!puedeVer(req, estudianteId)) {
    return res.status(403).json({ error: 'No autorizado para esta operación' });
  }

  try {
    const matricula = await prisma.matricula.findUnique({
      where: { usuarioId: estudianteId },
      select: { id: true, activo: true, cursoId: true }
    });
    if (!matricula || !matricula.activo) return res.json([]);

    const tareas = await prisma.tarea.findMany({
      where: {
        materia: { cursoId: matricula.cursoId, activo: true },
        fechaFin: { gte: new Date() },
        entregas: { none: { matriculaId: matricula.id } },
        notas: { none: { matriculaId: matricula.id, valor: { not: null } } }
      },
      orderBy: { fechaFin: 'asc' },
      take: 10,
      select: {
        id: true,
        nombre: true,
        fechaFin: true,
        semestre: true,
        materiaId: true,
        materia: { select: { nombre: true } }
      }
    });

    res.json(
      tareas.map((t) => ({
        id: t.id,
        titulo: t.nombre,
        materia: t.materia.nombre,
        materiaId: t.materiaId,
        semestre: t.semestre,
        fechaLimite: t.fechaFin
      }))
    );
  } catch (error) {
    console.error('Error al obtener tareas pendientes', estudianteId, error);
    res.status(500).json({ error: 'Error al obtener las tareas pendientes' });
  }
};
