import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calcularDisciplinaPonderada, calcularDisciplinaAnual } from '../lib/disciplina';
import { getConfiguracion, notaEnRango, primeraNotaFueraDeRango } from '../lib/configuracion';

export const guardarNotaDisciplina = async (req: Request, res: Response) => {
  const { matriculaId, materiaId, valor, semestre } = req.body;
  try {
    const config = await getConfiguracion();
    if (valor !== null && valor !== '' && !notaEnRango(Number(valor), config)) {
      return res.status(400).json({
        error: `La nota debe estar entre ${config.notaMinima} y ${config.notaMaxima}`
      });
    }
    const nota = await prisma.notaDisciplina.upsert({
      where: {
        matriculaId_materiaId_semestre: {
          matriculaId: Number(matriculaId),
          materiaId: Number(materiaId),
          semestre: Number(semestre || 1)
        }
      },
      update: { valor: Number(valor) },
      create: {
        matriculaId: Number(matriculaId),
        materiaId: Number(materiaId),
        valor: Number(valor),
        semestre: Number(semestre || 1)
      }
    });
    res.json({ message: 'Nota de disciplina guardada', nota });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar nota de disciplina' });
  }
};

export const guardarNotasDisciplinaMasivo = async (req: Request, res: Response) => {
  const { notas, semestre } = req.body;
  try {
    const config = await getConfiguracion();
    const fuera = primeraNotaFueraDeRango(
      notas.map((n: any) => (n.valor !== '' && n.valor !== null ? Number(n.valor) : null)),
      config
    );
    if (fuera !== null) {
      return res.status(400).json({
        error: `La nota ${fuera} está fuera del rango permitido (${config.notaMinima} - ${config.notaMaxima})`
      });
    }
    const resultados = await Promise.all(
      notas.map((n: any) =>
        prisma.notaDisciplina.upsert({
          where: {
            matriculaId_materiaId_semestre: {
              matriculaId: Number(n.matriculaId),
              materiaId: Number(n.materiaId),
              semestre: Number(n.semestre || semestre || 1)
            }
          },
          update: { valor: Number(n.valor) },
          create: {
            matriculaId: Number(n.matriculaId),
            materiaId: Number(n.materiaId),
            valor: Number(n.valor),
            semestre: Number(n.semestre || semestre || 1)
          }
        })
      )
    );
    res.json({ message: 'Notas guardadas', total: resultados.length });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar notas de disciplina' });
  }
};

export const getNotasDisciplinaPorMateria = async (req: Request, res: Response) => {
  const { materiaId } = req.params;
  const { semestre } = req.query;
  try {
    const notas = await prisma.notaDisciplina.findMany({
      where: {
        materiaId: Number(materiaId),
        ...(semestre ? { semestre: Number(semestre) } : {})
      },
      include: {
        matricula: {
          select: { id: true, nombres: true, apellidos: true, cedula: true }
        }
      },
      orderBy: { matricula: { apellidos: 'asc' } }
    });
    res.json(notas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener notas de disciplina' });
  }
};

export const getNotasDisciplinaPorCurso = async (req: Request, res: Response) => {
  const { cursoId } = req.params;
  const { semestre } = req.query;
  try {
    const matriculas = await prisma.matricula.findMany({
      where: { cursoId: Number(cursoId) },
      include: {
        notasDisciplina: {
          where: semestre ? { semestre: Number(semestre) } : undefined,
          include: { materia: { select: { nombre: true, esSubmateria: true, materiaParent: true } } }
        }
      },
      orderBy: { apellidos: 'asc' }
    });

    const resumen = matriculas.map(m => {
      const promedio = semestre
        ? calcularDisciplinaPonderada(m.notasDisciplina)
        : calcularDisciplinaAnual(m.notasDisciplina);
      return {
        matriculaId: m.id,
        nombres: m.nombres,
        apellidos: m.apellidos,
        promedio: promedio !== null
          ? (promedio % 1 === 0 ? String(promedio) : promedio.toFixed(1))
          : '-'
      };
    });

    res.json(resumen);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener notas de disciplina' });
  }
};

export const getEstudiantesPorMateria = async (req: Request, res: Response) => {
  const { materiaId } = req.params;
  try {
    const materia = await prisma.materia.findUnique({
      where: { id: Number(materiaId) },
      include: {
        curso: {
          include: {
            matriculas: { orderBy: { apellidos: 'asc' } }
          }
        }
      }
    });
    if (!materia) return res.status(404).json({ error: 'Materia no encontrada' });

    // Si es submateria, buscar la gemela (mismo nombre, parent opuesto) para que
    // la nota del profesor se registre en Práctica y Teoría de SU submateria
    let materiaGemelaId: number | null = null;
    if (materia.esSubmateria) {
      const gemela = await prisma.materia.findFirst({
        where: {
          cursoId: materia.cursoId,
          nombre: materia.nombre,
          esSubmateria: true,
          materiaParent: materia.materiaParent === 'Práctica' ? 'Teoría' : 'Práctica',
          NOT: { id: materia.id }
        }
      });
      materiaGemelaId = gemela?.id || null;
    }

    res.json({
      materia: {
        id: materia.id,
        nombre: materia.nombre,
        esSubmateria: materia.esSubmateria,
        materiaParent: materia.materiaParent
      },
      matriculas: materia.curso.matriculas,
      materiaGemelaId
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estudiantes' });
  }
};