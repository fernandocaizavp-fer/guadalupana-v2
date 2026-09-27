import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const MATERIAS_DEFAULT = [
  'Teoría',
  'Práctica',
  'Administración de Talleres',
  'Contabilidad',
  'TICs',
  'Inglés Técnico',
  'Desarrollo Humano y Ética Profesional',
  'Elaboración de Proyectos Productivos y/o Servicios',
  'Legislación'
];

export const crearCurso = async (req: Request, res: Response) => {
  const { ramaArtesanal, anioFormativo, fechaInicio, fechaFin } = req.body;
  try {
    const curso = await prisma.curso.create({
      data: {
        ramaArtesanal,
        anioFormativo,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        materias: {
          create: MATERIAS_DEFAULT.map(nombre => ({ nombre }))
        }
      },
      include: { materias: true }
    });
    res.json({ message: 'Curso creado', curso });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear curso' });
  }
};

export const listarCursos = async (req: Request, res: Response) => {
  try {
    const cursos = await prisma.curso.findMany({
      // Solo cuenta matrículas activas: las archivadas (activo=false) no suman.
      include: { materias: true, _count: { select: { matriculas: { where: { activo: true } } } } }
    });
    res.json(cursos);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar cursos' });
  }
};

export const obtenerCurso = async (req: Request, res: Response) => {
  try {
    const curso = await prisma.curso.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        materias: {
          include: {
            profesor: { select: { id: true, nombre: true, apellido: true, cedula: true } },
            profesorPrincipal: { select: { id: true, nombre: true, apellido: true, cedula: true } }
          },
          orderBy: { id: 'asc' }
        },
        // Solo matrículas activas: las archivadas (activo=false) quedan ocultas.
        matriculas: { where: { activo: true } }
      }
    });
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(curso);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener curso' });
  }
};

export const actualizarCurso = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ramaArtesanal, anioFormativo, fechaInicio, fechaFin } = req.body;
  try {
    const data: any = {};
    if (ramaArtesanal !== undefined) data.ramaArtesanal = ramaArtesanal;
    if (anioFormativo !== undefined) data.anioFormativo = anioFormativo;
    if (fechaInicio) data.fechaInicio = new Date(fechaInicio);
    if (fechaFin) data.fechaFin = new Date(fechaFin);

    const curso = await prisma.curso.update({
      where: { id: Number(id) },
      data
    });
    res.json({ message: 'Curso actualizado', curso });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar curso' });
  }
};

// Elimina un curso.
//
// La relación Matricula -> Curso NO usa onDelete: Cascade (a diferencia de
// Materia y ObservacionAsistencia): es deliberado, porque borrar un curso en
// cascada arrastraría datos personales, notas, asistencias y supletorios del
// estudiante de forma irreversible. Por eso la FK es Restrict y el borrado se
// controla aquí, de forma explícita y en dos pasos:
//
//   - Matrículas ACTIVAS  -> 409, nunca se borra.
//   - Matrículas ARCHIVADAS (activo=false) -> 409 con requiereConfirmacion:
//     el cliente debe reintentar con ?forzar=true. Ojo: 'archivada' es un
//     borrado lógico, la fila sigue existiendo y por eso la FK bloquea aunque
//     el curso se vea vacío en el listado.
//   - Sin matrículas -> se borra directamente.
export const eliminarCurso = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const forzar = req.query.forzar === 'true';
  try {
    const [activas, archivadas] = await Promise.all([
      prisma.matricula.count({ where: { cursoId: id, activo: true } }),
      prisma.matricula.count({ where: { cursoId: id, activo: false } })
    ]);

    if (activas > 0) {
      return res.status(409).json({
        error:
          `No se puede eliminar: el curso tiene ${activas} estudiante(s) matriculado(s). ` +
          'Retire primero las matrículas.'
      });
    }

    if (archivadas > 0 && !forzar) {
      return res.status(409).json({
        requiereConfirmacion: true,
        matriculasArchivadas: archivadas,
        error:
          `El curso tiene ${archivadas} matrícula(s) archivada(s). Al eliminarlo se borrarán ` +
          'también sus notas, asistencias y supletorios de forma irreversible.'
      });
    }

    // Transacción: las matrículas archivadas deben desaparecer antes que el
    // curso o la FK aborta el DELETE. Sus tablas satélite sí van en cascada.
    await prisma.$transaction([
      prisma.matricula.deleteMany({ where: { cursoId: id } }),
      prisma.curso.delete({ where: { id } })
    ]);
    res.json({ message: 'Curso eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar curso', id, error);
    // Red de seguridad: cualquier otra FK que apunte al curso y no esté
    // contemplada arriba llega aquí como P2003 en vez de un 500 opaco.
    if (error?.code === 'P2003') {
      return res.status(409).json({
        error: 'No se puede eliminar el curso porque tiene registros asociados.'
      });
    }
    res.status(500).json({ error: 'Error al eliminar curso' });
  }
};

// Agregar submateria a Práctica o Teoría
export const agregarSubmateria = async (req: Request, res: Response) => {
  const { cursoId, nombre } = req.body;
  try {
    const [practica, teoria] = await prisma.$transaction([
      prisma.materia.create({
        data: { nombre, cursoId: Number(cursoId), esSubmateria: true, materiaParent: 'Práctica' }
      }),
      prisma.materia.create({
        data: { nombre, cursoId: Number(cursoId), esSubmateria: true, materiaParent: 'Teoría' }
      })
    ]);
    res.json({ message: 'Submateria creada en Práctica y Teoría', practica, teoria });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear submateria' });
  }
};

// Eliminar submateria
export const eliminarSubmateria = async (req: Request, res: Response) => {
  try {
    const materia = await prisma.materia.findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!materia?.esSubmateria) {
      return res.status(400).json({ error: 'Solo se pueden eliminar submaterias' });
    }
    await prisma.materia.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Submateria eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar submateria' });
  }
};

// Obtener submaterias de un curso por parent
export const getSubmaterias = async (req: Request, res: Response) => {
  const { cursoId, parent } = req.params;
  try {
    const submaterias = await prisma.materia.findMany({
      where: {
        cursoId: Number(cursoId),
        esSubmateria: true,
        materiaParent: String(parent)
      },
      include: {
        profesor: { select: { id: true, nombre: true, apellido: true, cedula: true } }
      },
      orderBy: { id: 'asc' }
    });
    res.json(submaterias);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener submaterias' });
  }
};