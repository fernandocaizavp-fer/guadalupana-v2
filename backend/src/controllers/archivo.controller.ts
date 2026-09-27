import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { subirArchivo, eliminarArchivo } from '../lib/cloudinary';
import { validarTamano } from '../middlewares/upload.middleware';

// Multer decodifica el nombre del archivo como latin1; lo reinterpretamos como
// UTF-8 para conservar bien las tildes y la ñ (p. ej. "rúbrica evaluación").
function nombreUtf8(nombre: string): string {
  return Buffer.from(nombre, 'latin1').toString('utf8');
}

// Busca la matrícula del usuario autenticado (estudiante).
async function matriculaDelUsuario(req: any) {
  if (!req.usuario?.id) return null;
  return prisma.matricula.findUnique({ where: { usuarioId: Number(req.usuario.id) } });
}

// ---------- ARCHIVOS DE LA TAREA (los sube el docente) ----------

// POST /api/tareas/:tareaId/archivos
export const subirArchivosTarea = async (req: Request, res: Response) => {
  const { tareaId } = req.params;
  const archivos = (req.files as Express.Multer.File[]) || [];
  if (archivos.length === 0) {
    return res.status(400).json({ error: 'No se enviaron archivos' });
  }
  if (!validarTamano(req, res)) return;
  try {
    const creados = [];
    for (const archivo of archivos) {
      const nombre = nombreUtf8(archivo.originalname);
      const subido = await subirArchivo(archivo.buffer, nombre);
      const fila = await prisma.archivoTarea.create({
        data: {
          url: subido.url,
          publicId: subido.publicId,
          resourceType: subido.resourceType,
          nombreOriginal: nombre,
          tipo: archivo.mimetype,
          tamano: archivo.size,
          tareaId: Number(tareaId)
        }
      });
      creados.push(fila);
    }
    res.json({ message: 'Archivos subidos', archivos: creados });
  } catch (error) {
    res.status(500).json({ error: 'Error al subir los archivos' });
  }
};

// DELETE /api/tareas/archivos/:id
export const eliminarArchivoTarea = async (req: Request, res: Response) => {
  try {
    const archivo = await prisma.archivoTarea.findUnique({ where: { id: Number(req.params.id) } });
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado' });
    await eliminarArchivo(archivo.publicId, archivo.resourceType || 'image');
    await prisma.archivoTarea.delete({ where: { id: archivo.id } });
    res.json({ message: 'Archivo eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el archivo' });
  }
};

// ---------- ENTREGAS DEL ESTUDIANTE ----------

// POST /api/tareas/:tareaId/entregas  (el estudiante sube su entrega)
export const subirEntrega = async (req: any, res: Response) => {
  const { tareaId } = req.params;
  const { comentario } = req.body;
  const archivos = (req.files as Express.Multer.File[]) || [];
  if (archivos.length === 0) {
    return res.status(400).json({ error: 'No se enviaron archivos' });
  }
  if (!validarTamano(req, res)) return;
  try {
    // La fecha límite bloquea la entrega: pasado ese momento no se admiten archivos.
    const tarea = await prisma.tarea.findUnique({
      where: { id: Number(tareaId) },
      select: { fechaFin: true }
    });
    if (tarea?.fechaFin && new Date() > tarea.fechaFin) {
      return res.status(403).json({ error: 'El plazo de entrega ya finalizó; no se pueden subir más archivos' });
    }

    const matricula = await matriculaDelUsuario(req);
    if (!matricula) return res.status(403).json({ error: 'No se encontró la matrícula del estudiante' });

    // Cabecera de entrega (una por tarea + matrícula)
    const entrega = await prisma.entregaTarea.upsert({
      where: { tareaId_matriculaId: { tareaId: Number(tareaId), matriculaId: matricula.id } },
      update: { comentario: comentario ?? undefined },
      create: { tareaId: Number(tareaId), matriculaId: matricula.id, comentario: comentario || null }
    });

    const creados = [];
    for (const archivo of archivos) {
      const nombre = nombreUtf8(archivo.originalname);
      const subido = await subirArchivo(archivo.buffer, nombre);
      const fila = await prisma.archivoEntrega.create({
        data: {
          url: subido.url,
          publicId: subido.publicId,
          resourceType: subido.resourceType,
          nombreOriginal: nombre,
          tipo: archivo.mimetype,
          tamano: archivo.size,
          entregaId: entrega.id
        }
      });
      creados.push(fila);
    }
    res.json({ message: 'Entrega subida', entregaId: entrega.id, archivos: creados });
  } catch (error) {
    res.status(500).json({ error: 'Error al subir la entrega' });
  }
};

// GET /api/tareas/:tareaId/entregas/mias  (el estudiante ve su propia entrega)
export const getMiEntrega = async (req: any, res: Response) => {
  const { tareaId } = req.params;
  try {
    const matricula = await matriculaDelUsuario(req);
    if (!matricula) return res.status(403).json({ error: 'No se encontró la matrícula del estudiante' });

    const entrega = await prisma.entregaTarea.findUnique({
      where: { tareaId_matriculaId: { tareaId: Number(tareaId), matriculaId: matricula.id } },
      include: { archivos: { orderBy: { createdAt: 'asc' } } }
    });
    res.json(entrega || null);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la entrega' });
  }
};

// DELETE /api/tareas/entregas/archivos/:id  (el estudiante elimina un archivo suyo)
export const eliminarArchivoEntrega = async (req: any, res: Response) => {
  try {
    const matricula = await matriculaDelUsuario(req);
    if (!matricula) return res.status(403).json({ error: 'No se encontró la matrícula del estudiante' });

    const archivo = await prisma.archivoEntrega.findUnique({
      where: { id: Number(req.params.id) },
      include: { entrega: true }
    });
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado' });
    // Solo el dueño de la entrega puede eliminar
    if (archivo.entrega.matriculaId !== matricula.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await eliminarArchivo(archivo.publicId, archivo.resourceType || 'image');
    await prisma.archivoEntrega.delete({ where: { id: archivo.id } });
    res.json({ message: 'Archivo eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el archivo' });
  }
};

// GET /api/tareas/:tareaId/entregas  (el docente ve las entregas de los estudiantes)
export const getEntregasTarea = async (req: Request, res: Response) => {
  const { tareaId } = req.params;
  try {
    const entregas = await prisma.entregaTarea.findMany({
      where: { tareaId: Number(tareaId) },
      include: {
        archivos: { orderBy: { createdAt: 'asc' } },
        matricula: { select: { id: true, nombres: true, apellidos: true } }
      },
      orderBy: { matricula: { apellidos: 'asc' } }
    });
    res.json(entregas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las entregas' });
  }
};
