import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getConfiguracion, notaEnRango } from '../lib/configuracion';
import { ClaveMateria, MATERIAS_EXAMEN, MATERIAS_GLOBALES } from '../lib/registro-global';

// Ingreso rápido masivo (Configuración, solo ADMIN). El administrador escribe las
// notas finales de todo un curso en una tabla y los formatos AL las usan con
// prioridad sobre el flujo normal (ver lib/registro-global.ts).
//
// Cada POST recibe las casillas de la tabla: una casilla con valor se guarda
// (crea o actualiza) y una casilla vacía borra el registro rápido, de modo que
// ese dato vuelve a calcularse desde el flujo normal. Todo en una transacción:
// o se guarda la tabla completa o no se guarda nada.

const MAX_CASILLAS = 6000;

class ErrorValidacion extends Error {}

// '' / null / undefined → null (casilla vacía). Cualquier otra cosa debe ser un número.
const leerValor = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === '') return null;
  const num = Number(valor);
  if (!Number.isFinite(num)) throw new ErrorValidacion(`"${valor}" no es un número válido`);
  return Math.round(num * 100) / 100;
};

// Estudiantes con matrícula activa del curso, en el mismo orden que los AL.
const estudiantesDelCurso = (cursoId: number) =>
  prisma.matricula.findMany({
    where: { cursoId, activo: true },
    select: { id: true, apellidos: true, nombres: true, cedula: true },
    orderBy: { apellidos: 'asc' }
  });

const leerCursoId = (valor: unknown): number => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorValidacion('Curso no válido');
  return id;
};

// Comprueba que todas las matrículas enviadas pertenezcan al curso indicado.
const validarMatriculas = async (cursoId: number, ids: number[]) => {
  const unicos = Array.from(new Set(ids));
  if (unicos.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new ErrorValidacion('Hay estudiantes no válidos en la tabla');
  }
  const encontrados = await prisma.matricula.count({ where: { id: { in: unicos }, cursoId } });
  if (encontrados !== unicos.length) {
    throw new ErrorValidacion('Hay estudiantes que no pertenecen a este curso');
  }
};

// Una misma casilla repetida en el envío chocaría con la clave única de la tabla.
const sinDuplicados = (claves: string[]) => {
  if (new Set(claves).size !== claves.length) throw new ErrorValidacion('Hay casillas repetidas en la tabla');
};

const leerLista = (valor: unknown, nombre: string): any[] => {
  if (!Array.isArray(valor)) throw new ErrorValidacion(`Falta la lista de ${nombre}`);
  if (valor.length > MAX_CASILLAS) throw new ErrorValidacion('La tabla es demasiado grande');
  return valor;
};

const responderError = (res: Response, error: unknown, mensaje: string) => {
  if (error instanceof ErrorValidacion) return res.status(400).json({ error: error.message });
  console.error(error);
  res.status(500).json({ error: mensaje });
};

// ===== NOTAS (AL14, AL15, AL16, AL19, AL22) =====

export const obtenerNotasBulk = async (req: Request, res: Response) => {
  try {
    const cursoId = leerCursoId(req.params.cursoId);
    const estudiantes = await estudiantesDelCurso(cursoId);
    const registros = await prisma.registroNotaGlobal.findMany({
      where: { matriculaId: { in: estudiantes.map((e) => e.id) } },
      select: { matriculaId: true, materia: true, semestre: true, nota: true }
    });
    res.json({ estudiantes, registros });
  } catch (error) {
    responderError(res, error, 'Error al obtener las notas');
  }
};

export const guardarNotasBulk = async (req: any, res: Response) => {
  try {
    const cursoId = leerCursoId(req.body.cursoId);
    const config = await getConfiguracion();
    const celdas = leerLista(req.body.notas, 'notas').map((c) => {
      const materia = String(c?.materia) as ClaveMateria;
      const semestre = Number(c?.semestre);
      if (!MATERIAS_GLOBALES.includes(materia)) throw new ErrorValidacion(`Materia no válida: ${c?.materia}`);
      if (semestre !== 1 && semestre !== 2) throw new ErrorValidacion('El semestre debe ser 1 o 2');
      const nota = leerValor(c?.nota);
      if (nota !== null && !notaEnRango(nota, config)) {
        throw new ErrorValidacion(`La nota ${nota} está fuera del rango (${config.notaMinima} - ${config.notaMaxima})`);
      }
      return { matriculaId: Number(c?.matriculaId), materia, semestre, nota };
    });
    await validarMatriculas(cursoId, celdas.map((c) => c.matriculaId));
    sinDuplicados(celdas.map((c) => `${c.matriculaId}-${c.materia}-${c.semestre}`));

    const registradoPorId = Number(req.usuario?.id) || null;
    const llenas = celdas.filter((c) => c.nota !== null);
    await prisma.$transaction(async (tx) => {
      if (celdas.length > 0) {
        await tx.registroNotaGlobal.deleteMany({
          where: { OR: celdas.map(({ matriculaId, materia, semestre }) => ({ matriculaId, materia, semestre })) }
        });
      }
      if (llenas.length > 0) {
        await tx.registroNotaGlobal.createMany({
          data: llenas.map((c) => ({ ...c, nota: c.nota as number, registradoPorId }))
        });
      }
    }, { maxWait: 20000, timeout: 60000 });

    res.json({ message: 'Notas guardadas', guardadas: llenas.length });
  } catch (error) {
    responderError(res, error, 'Error al guardar las notas');
  }
};

// ===== EXÁMENES DE GRADO (AL23) =====

export const obtenerExamenesBulk = async (req: Request, res: Response) => {
  try {
    const cursoId = leerCursoId(req.params.cursoId);
    const estudiantes = await estudiantesDelCurso(cursoId);
    const registros = await prisma.registroExamenGlobal.findMany({
      where: { matriculaId: { in: estudiantes.map((e) => e.id) } },
      select: { matriculaId: true, materia: true, nota: true }
    });
    res.json({ estudiantes, registros });
  } catch (error) {
    responderError(res, error, 'Error al obtener los exámenes');
  }
};

export const guardarExamenesBulk = async (req: any, res: Response) => {
  try {
    const cursoId = leerCursoId(req.body.cursoId);
    const config = await getConfiguracion();
    const celdas = leerLista(req.body.examenes, 'exámenes').map((c) => {
      const materia = String(c?.materia) as ClaveMateria;
      if (!MATERIAS_EXAMEN.includes(materia)) throw new ErrorValidacion(`Materia no válida: ${c?.materia}`);
      const nota = leerValor(c?.nota);
      if (nota !== null && !notaEnRango(nota, config)) {
        throw new ErrorValidacion(`La nota ${nota} está fuera del rango (${config.notaMinima} - ${config.notaMaxima})`);
      }
      return { matriculaId: Number(c?.matriculaId), materia, nota };
    });
    await validarMatriculas(cursoId, celdas.map((c) => c.matriculaId));
    sinDuplicados(celdas.map((c) => `${c.matriculaId}-${c.materia}`));

    const registradoPorId = Number(req.usuario?.id) || null;
    const llenas = celdas.filter((c) => c.nota !== null);
    await prisma.$transaction(async (tx) => {
      if (celdas.length > 0) {
        await tx.registroExamenGlobal.deleteMany({
          where: { OR: celdas.map(({ matriculaId, materia }) => ({ matriculaId, materia })) }
        });
      }
      if (llenas.length > 0) {
        await tx.registroExamenGlobal.createMany({
          data: llenas.map((c) => ({ ...c, nota: c.nota as number, registradoPorId }))
        });
      }
    }, { maxWait: 20000, timeout: 60000 });

    res.json({ message: 'Exámenes de grado guardados', guardadas: llenas.length });
  } catch (error) {
    responderError(res, error, 'Error al guardar los exámenes de grado');
  }
};

// ===== ASISTENCIA (AL18) =====

export const obtenerAsistenciasBulk = async (req: Request, res: Response) => {
  try {
    const cursoId = leerCursoId(req.params.cursoId);
    const estudiantes = await estudiantesDelCurso(cursoId);
    const registros = await prisma.registroAsistenciaGlobal.findMany({
      where: { matriculaId: { in: estudiantes.map((e) => e.id) } },
      select: { matriculaId: true, porcentaje: true }
    });
    res.json({ estudiantes, registros });
  } catch (error) {
    responderError(res, error, 'Error al obtener las asistencias');
  }
};

export const guardarAsistenciasBulk = async (req: any, res: Response) => {
  try {
    const cursoId = leerCursoId(req.body.cursoId);
    const celdas = leerLista(req.body.asistencias, 'asistencias').map((c) => {
      const porcentaje = leerValor(c?.porcentaje);
      if (porcentaje !== null && (porcentaje < 0 || porcentaje > 100)) {
        throw new ErrorValidacion(`El porcentaje ${porcentaje} debe estar entre 0 y 100`);
      }
      return { matriculaId: Number(c?.matriculaId), porcentaje };
    });
    await validarMatriculas(cursoId, celdas.map((c) => c.matriculaId));
    sinDuplicados(celdas.map((c) => String(c.matriculaId)));

    const registradoPorId = Number(req.usuario?.id) || null;
    const llenas = celdas.filter((c) => c.porcentaje !== null);
    await prisma.$transaction(async (tx) => {
      if (celdas.length > 0) {
        await tx.registroAsistenciaGlobal.deleteMany({
          where: { matriculaId: { in: celdas.map((c) => c.matriculaId) } }
        });
      }
      if (llenas.length > 0) {
        await tx.registroAsistenciaGlobal.createMany({
          data: llenas.map((c) => ({ ...c, porcentaje: c.porcentaje as number, registradoPorId }))
        });
      }
    }, { maxWait: 20000, timeout: 60000 });

    res.json({ message: 'Asistencias guardadas', guardadas: llenas.length });
  } catch (error) {
    responderError(res, error, 'Error al guardar las asistencias');
  }
};

// ===== LIMPIAR =====
// Borra de una vez los registros rápidos de un curso (una pestaña). Los AL vuelven
// a calcularse desde el flujo normal; no toca tareas, listas ni exámenes por materia.
// Incluye matrículas archivadas del curso para no dejar registros huérfanos.

const limpiar = (tipo: 'notas' | 'examenes' | 'asistencias') => async (req: Request, res: Response) => {
  try {
    const cursoId = leerCursoId(req.params.cursoId);
    const where = { matricula: { cursoId } };
    const { count } = tipo === 'notas'
      ? await prisma.registroNotaGlobal.deleteMany({ where })
      : tipo === 'examenes'
        ? await prisma.registroExamenGlobal.deleteMany({ where })
        : await prisma.registroAsistenciaGlobal.deleteMany({ where });
    res.json({ message: 'Datos borrados', borrados: count });
  } catch (error) {
    responderError(res, error, 'Error al borrar los datos');
  }
};

export const limpiarNotasBulk = limpiar('notas');
export const limpiarExamenesBulk = limpiar('examenes');
export const limpiarAsistenciasBulk = limpiar('asistencias');
