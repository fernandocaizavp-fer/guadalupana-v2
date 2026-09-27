import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getConfiguracion } from '../lib/configuracion';

// GET /api/configuracion — lectura abierta a cualquier autenticado
// (el frontend necesita el rango de notas y la ventana para renderizar).
export const obtenerConfiguracion = async (req: Request, res: Response) => {
  try {
    const config = await getConfiguracion();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
};

// PUT /api/configuracion — solo ADMIN
export const actualizarConfiguracion = async (req: Request, res: Response) => {
  const {
    supletorioInicio,
    supletorioFin,
    examenGradoInicio,
    examenGradoFin,
    notaMinima,
    notaMaxima,
    notaAprobacion
  } = req.body;

  // Validación del rango de notas
  const min = Number(notaMinima);
  const max = Number(notaMaxima);
  const aprob = Number(notaAprobacion);
  if ([min, max, aprob].some((n) => isNaN(n))) {
    return res.status(400).json({ error: 'Las notas deben ser numéricas' });
  }
  if (min >= max) {
    return res.status(400).json({ error: 'La nota mínima debe ser menor que la máxima' });
  }
  if (aprob < min || aprob > max) {
    return res.status(400).json({ error: 'La nota de aprobación debe estar dentro del rango' });
  }

  try {
    const config = await prisma.configuracion.upsert({
      where: { id: 1 },
      update: {
        supletorioInicio: supletorioInicio ? new Date(supletorioInicio) : null,
        supletorioFin: supletorioFin ? new Date(supletorioFin) : null,
        examenGradoInicio: examenGradoInicio ? new Date(examenGradoInicio) : null,
        examenGradoFin: examenGradoFin ? new Date(examenGradoFin) : null,
        notaMinima: min,
        notaMaxima: max,
        notaAprobacion: aprob
      },
      create: {
        id: 1,
        supletorioInicio: supletorioInicio ? new Date(supletorioInicio) : null,
        supletorioFin: supletorioFin ? new Date(supletorioFin) : null,
        examenGradoInicio: examenGradoInicio ? new Date(examenGradoInicio) : null,
        examenGradoFin: examenGradoFin ? new Date(examenGradoFin) : null,
        notaMinima: min,
        notaMaxima: max,
        notaAprobacion: aprob
      }
    });
    res.json({ message: 'Configuración actualizada', configuracion: config });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
};

// POST /api/configuracion/permiso-supletorio — solo ADMIN
// Habilita el supletorio para un estudiante (matrícula) hasta una fecha,
// aunque el plazo general haya vencido (caso de reclamo/oficio).
export const habilitarSupletorioIndividual = async (req: Request, res: Response) => {
  const { matriculaId, habilitadoHasta, motivo } = req.body;
  if (!matriculaId || !habilitadoHasta) {
    return res.status(400).json({ error: 'Se requiere matriculaId y la fecha límite' });
  }
  try {
    const matricula = await prisma.matricula.update({
      where: { id: Number(matriculaId) },
      data: {
        supletorioHabilitadoHasta: new Date(habilitadoHasta),
        supletorioMotivo: motivo || null
      },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        supletorioHabilitadoHasta: true,
        supletorioMotivo: true
      }
    });
    res.json({ message: 'Permiso individual de supletorio habilitado', matricula });
  } catch (error) {
    res.status(500).json({ error: 'Error al habilitar el supletorio individual' });
  }
};

// GET /api/configuracion/permisos-supletorio — solo ADMIN
// Lista las matrículas con un permiso individual de supletorio vigente (fecha
// no nula), para poder mostrarlas y revocarlas sin tener que volver a buscar.
export const listarPermisosSupletorio = async (req: Request, res: Response) => {
  try {
    const matriculas = await prisma.matricula.findMany({
      where: { supletorioHabilitadoHasta: { not: null } },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        cedula: true,
        supletorioHabilitadoHasta: true,
        supletorioMotivo: true,
        curso: { select: { ramaArtesanal: true } }
      },
      orderBy: { supletorioHabilitadoHasta: 'asc' }
    });
    res.json(matriculas);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar los permisos de supletorio' });
  }
};

// DELETE /api/configuracion/permiso-supletorio/:matriculaId — solo ADMIN
// Revoca el permiso individual.
export const revocarSupletorioIndividual = async (req: Request, res: Response) => {
  try {
    const matricula = await prisma.matricula.update({
      where: { id: Number(req.params.matriculaId) },
      data: { supletorioHabilitadoHasta: null, supletorioMotivo: null },
      select: { id: true, nombres: true, apellidos: true }
    });
    res.json({ message: 'Permiso individual revocado', matricula });
  } catch (error) {
    res.status(500).json({ error: 'Error al revocar el permiso individual' });
  }
};

// ── Recalificación de examen de grado (permiso individual, análogo al supletorio) ──

// POST /api/configuracion/permiso-examen-grado — solo ADMIN
// Habilita a un estudiante a corregir su examen de grado fuera del plazo general.
export const habilitarRecalificacionExamen = async (req: Request, res: Response) => {
  const { matriculaId, habilitadoHasta, motivo } = req.body;
  if (!matriculaId || !habilitadoHasta) {
    return res.status(400).json({ error: 'Se requiere matriculaId y la fecha límite' });
  }
  try {
    const matricula = await prisma.matricula.update({
      where: { id: Number(matriculaId) },
      data: {
        examenGradoHabilitadoHasta: new Date(habilitadoHasta),
        examenGradoMotivo: motivo || null
      },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        examenGradoHabilitadoHasta: true,
        examenGradoMotivo: true
      }
    });
    res.json({ message: 'Recalificación de examen de grado habilitada', matricula });
  } catch (error) {
    res.status(500).json({ error: 'Error al habilitar la recalificación de examen de grado' });
  }
};

// GET /api/configuracion/permisos-examen-grado — solo ADMIN
// Lista las matrículas con recalificación de examen de grado vigente.
export const listarPermisosExamenGrado = async (req: Request, res: Response) => {
  try {
    const matriculas = await prisma.matricula.findMany({
      where: { examenGradoHabilitadoHasta: { not: null } },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        cedula: true,
        examenGradoHabilitadoHasta: true,
        examenGradoMotivo: true,
        curso: { select: { ramaArtesanal: true } }
      },
      orderBy: { examenGradoHabilitadoHasta: 'asc' }
    });
    res.json(matriculas);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar las recalificaciones de examen de grado' });
  }
};

// DELETE /api/configuracion/permiso-examen-grado/:matriculaId — solo ADMIN
// Revoca la recalificación individual (conserva la nota ya corregida).
export const revocarRecalificacionExamen = async (req: Request, res: Response) => {
  try {
    const matricula = await prisma.matricula.update({
      where: { id: Number(req.params.matriculaId) },
      data: { examenGradoHabilitadoHasta: null, examenGradoMotivo: null },
      select: { id: true, nombres: true, apellidos: true }
    });
    res.json({ message: 'Recalificación revocada', matricula });
  } catch (error) {
    res.status(500).json({ error: 'Error al revocar la recalificación' });
  }
};
