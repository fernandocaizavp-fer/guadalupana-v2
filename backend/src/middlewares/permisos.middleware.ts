import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

// Autorización por recurso, complemento de soloRoles: soloRoles('ADMIN','PROFESOR')
// dice QUIÉN puede escribir calificaciones; este middleware dice SOBRE QUÉ materia.
// Un docente solo modifica tareas, notas, asistencia, disciplina, supletorios y
// exámenes de las materias que tiene asignadas. El ADMIN no tiene esa restricción.
//
// Además, para cualquier rol, cada estudiante enviado debe pertenecer al curso de la
// materia (evita guardar notas de un curso en la materia de otro).

interface Objetivo {
  materiaIds: number[];
  pares: { materiaId: number; matriculaId: number }[];
}

// Devuelve las materias y pares (materia, matrícula) que toca la petición,
// o null si el registro referido (tarea, asistencia, archivo) no existe.
type Resolver = (req: Request) => Promise<Objetivo | null>;

const entero = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const CONTENEDORAS = ['Práctica', 'Teoría'];

// Materias de la lista que el docente puede calificar:
//  1. es el docente (profesorId) o el docente principal (profesorPrincipalId) de la materia;
//  2. en una submateria, es el docente de su gemela (la disciplina se guarda en ambas);
//  3. es docente principal del curso y la materia es Práctica/Teoría o una submateria.
export const materiasDelDocente = async (usuarioId: number, materiaIds: number[]): Promise<Set<number>> => {
  const materias = await prisma.materia.findMany({
    where: { id: { in: materiaIds } },
    select: { id: true, nombre: true, cursoId: true, esSubmateria: true, profesorId: true, profesorPrincipalId: true }
  });
  const cursoIds = Array.from(new Set(materias.map((m) => m.cursoId)));
  const [propiasDelCurso, principalEn] = await Promise.all([
    prisma.materia.findMany({
      where: { cursoId: { in: cursoIds }, esSubmateria: true, profesorId: usuarioId },
      select: { cursoId: true, nombre: true }
    }),
    prisma.materia.findMany({
      where: { cursoId: { in: cursoIds }, profesorPrincipalId: usuarioId },
      select: { cursoId: true }
    })
  ]);
  return decidirMateriasPermitidas(usuarioId, materias, propiasDelCurso, principalEn.map((m) => m.cursoId));
};

interface MateriaParaPermiso {
  id: number;
  nombre: string;
  cursoId: number;
  esSubmateria: boolean;
  profesorId: number | null;
  profesorPrincipalId: number | null;
}

// La regla, separada del acceso a datos para poder probarla sin base de datos.
//   submateriasPropias: submaterias de esos cursos donde el docente es profesorId.
//   cursosPrincipal:    cursos donde el docente es docente principal de alguna materia.
export const decidirMateriasPermitidas = (
  usuarioId: number,
  materias: MateriaParaPermiso[],
  submateriasPropias: { cursoId: number; nombre: string }[],
  cursosPrincipal: number[]
): Set<number> => {
  const gemelas = new Set(submateriasPropias.map((m) => `${m.cursoId}|${m.nombre}`));
  const principal = new Set(cursosPrincipal);

  const permitidas = new Set<number>();
  for (const m of materias) {
    if (m.profesorId === usuarioId || m.profesorPrincipalId === usuarioId) permitidas.add(m.id);
    else if (m.esSubmateria && gemelas.has(`${m.cursoId}|${m.nombre}`)) permitidas.add(m.id);
    else if (principal.has(m.cursoId) && (m.esSubmateria || CONTENEDORAS.includes(m.nombre))) permitidas.add(m.id);
  }
  return permitidas;
};

export const soloDocenteDeMateria = (resolver: Resolver) =>
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const objetivo = await resolver(req);
      if (!objetivo) return res.status(404).json({ error: 'Registro no encontrado' });

      const materiaIds = Array.from(new Set(objetivo.materiaIds));
      if (materiaIds.length === 0) return res.status(400).json({ error: 'Datos incompletos: falta la materia' });

      if (req.usuario?.rol !== 'ADMIN') {
        const permitidas = await materiasDelDocente(Number(req.usuario?.id), materiaIds);
        if (materiaIds.some((id) => !permitidas.has(id))) {
          return res.status(403).json({ error: 'Solo el docente asignado a la materia puede modificar sus registros' });
        }
      }

      if (objetivo.pares.length > 0) {
        const matriculaIds = Array.from(new Set(objetivo.pares.map((p) => p.matriculaId)));
        const [materias, matriculas] = await Promise.all([
          prisma.materia.findMany({ where: { id: { in: materiaIds } }, select: { id: true, cursoId: true } }),
          prisma.matricula.findMany({
            where: { id: { in: matriculaIds } }, select: { id: true, cursoId: true, activo: true }
          })
        ]);
        const cursoDeMateria = new Map(materias.map((m) => [m.id, m.cursoId]));
        const cursoDeMatricula = new Map(matriculas.map((m) => [m.id, m.cursoId]));
        const ajeno = objetivo.pares.some((p) =>
          cursoDeMatricula.get(p.matriculaId) === undefined ||
          cursoDeMatricula.get(p.matriculaId) !== cursoDeMateria.get(p.materiaId)
        );
        if (ajeno) return res.status(400).json({ error: 'Hay estudiantes que no pertenecen al curso de la materia' });
        if (matriculas.some((m) => !m.activo)) {
          return res.status(400).json({ error: 'Hay estudiantes dados de baja; no se pueden registrar sus calificaciones' });
        }
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al verificar los permisos sobre la materia' });
    }
  };

// ── Resolvers: de dónde sale la materia en cada ruta ──

// { materiaId, matriculaId? } en el cuerpo (crear tarea/asistencia, disciplina y supletorio individuales).
export const materiaDelCuerpo: Resolver = async (req) => {
  const materiaId = entero(req.body?.materiaId);
  const matriculaId = entero(req.body?.matriculaId);
  return {
    materiaIds: materiaId ? [materiaId] : [],
    pares: materiaId && matriculaId ? [{ materiaId, matriculaId }] : []
  };
};

// Lista de { materiaId, matriculaId } en req.body[campo] (disciplina, supletorios y exámenes masivos).
export const materiasDeLista = (campo: string): Resolver => async (req) => {
  const lista = Array.isArray(req.body?.[campo]) ? req.body[campo] : [];
  const pares: Objetivo['pares'] = [];
  const materiaIds: number[] = [];
  for (const item of lista) {
    const materiaId = entero(item?.materiaId);
    if (!materiaId) return { materiaIds: [], pares: [] }; // un elemento sin materia invalida el lote
    materiaIds.push(materiaId);
    const matriculaId = entero(item?.matriculaId);
    if (matriculaId) pares.push({ materiaId, matriculaId });
  }
  return { materiaIds, pares };
};

// Tarea en req.params[param] (editar/borrar tarea, adjuntos, ver entregas).
export const materiaDeTarea = (param: string): Resolver => async (req) => {
  const id = entero(req.params[param]);
  if (!id) return null;
  const tarea = await prisma.tarea.findUnique({ where: { id }, select: { materiaId: true } });
  return tarea ? { materiaIds: [tarea.materiaId], pares: [] } : null;
};

// Adjunto de tarea en req.params.id.
export const materiaDeArchivoTarea: Resolver = async (req) => {
  const id = entero(req.params.id);
  if (!id) return null;
  const archivo = await prisma.archivoTarea.findUnique({
    where: { id }, select: { tarea: { select: { materiaId: true } } }
  });
  return archivo ? { materiaIds: [archivo.tarea.materiaId], pares: [] } : null;
};

// Notas de tareas: lista { tareaId, matriculaId } en req.body.notas.
export const materiasDeNotasTarea: Resolver = async (req) => {
  const lista = Array.isArray(req.body?.notas) ? req.body.notas : [];
  const tareaIds = lista.map((n: any) => entero(n?.tareaId));
  if (tareaIds.length === 0 || tareaIds.some((id: number | null) => id === null)) return { materiaIds: [], pares: [] };
  const tareas = await prisma.tarea.findMany({
    where: { id: { in: tareaIds as number[] } }, select: { id: true, materiaId: true }
  });
  const materiaDe = new Map(tareas.map((t) => [t.id, t.materiaId]));
  if (materiaDe.size !== new Set(tareaIds).size) return null; // alguna tarea no existe
  const pares: Objetivo['pares'] = [];
  for (const n of lista) {
    const matriculaId = entero(n?.matriculaId);
    if (matriculaId) pares.push({ materiaId: materiaDe.get(Number(n.tareaId))!, matriculaId });
  }
  return { materiaIds: tareas.map((t) => t.materiaId), pares };
};

// Asistencia en req.params.id; al editar, sus detalles traen los estudiantes.
export const materiaDeAsistencia: Resolver = async (req) => {
  const id = entero(req.params.id);
  if (!id) return null;
  const asistencia = await prisma.asistencia.findUnique({ where: { id }, select: { materiaId: true } });
  if (!asistencia) return null;
  const detalles = Array.isArray(req.body?.detalles) ? req.body.detalles : [];
  const pares = detalles
    .map((d: any) => entero(d?.matriculaId))
    .filter((m: number | null): m is number => m !== null)
    .map((matriculaId: number) => ({ materiaId: asistencia.materiaId, matriculaId }));
  return { materiaIds: [asistencia.materiaId], pares };
};

// Crear asistencia: materia en el cuerpo y estudiantes en detalles.
export const materiaDeNuevaAsistencia: Resolver = async (req) => {
  const materiaId = entero(req.body?.materiaId);
  if (!materiaId) return { materiaIds: [], pares: [] };
  const detalles = Array.isArray(req.body?.detalles) ? req.body.detalles : [];
  const pares = detalles
    .map((d: any) => entero(d?.matriculaId))
    .filter((m: number | null): m is number => m !== null)
    .map((matriculaId: number) => ({ materiaId, matriculaId }));
  return { materiaIds: [materiaId], pares };
};

// Observación de asistencia (por curso): el docente debe dictar alguna materia
// del curso y el estudiante debe ser de ese curso.
export const soloDocenteDelCurso = async (req: any, res: Response, next: NextFunction) => {
  try {
    const cursoId = entero(req.body?.cursoId);
    const matriculaId = entero(req.body?.matriculaId);
    if (!cursoId || !matriculaId) return res.status(400).json({ error: 'Faltan el curso o el estudiante' });
    const matricula = await prisma.matricula.findUnique({ where: { id: matriculaId }, select: { cursoId: true } });
    if (!matricula || matricula.cursoId !== cursoId) {
      return res.status(400).json({ error: 'El estudiante no pertenece a ese curso' });
    }
    if (req.usuario?.rol !== 'ADMIN') {
      const uid = Number(req.usuario?.id);
      const dicta = await prisma.materia.count({
        where: { cursoId, OR: [{ profesorId: uid }, { profesorPrincipalId: uid }] }
      });
      if (dicta === 0) return res.status(403).json({ error: 'Solo los docentes del curso pueden registrar observaciones' });
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al verificar los permisos sobre el curso' });
  }
};

// El usuario solo consulta su propio id en req.params[param]; el ADMIN, cualquiera.
export const propioOAdmin = (param: string) => (req: any, res: Response, next: NextFunction) => {
  if (req.usuario?.rol === 'ADMIN') return next();
  if (Number(req.params[param]) !== Number(req.usuario?.id)) {
    return res.status(403).json({ error: 'Solo puedes consultar tu propia información' });
  }
  next();
};
