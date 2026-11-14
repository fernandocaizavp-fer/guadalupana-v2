import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Tipos permitidos de recurso didáctico de taller
const TIPOS_VALIDOS = ['GUIA_TALLER', 'LISTA_MATERIALES', 'VIDEO_TUTORIAL', 'DOCUMENTO'];

// GET /api/recursos?materiaId=...&cursoId=...&tipo=...
export const listarRecursos = async (req: Request, res: Response) => {
  const materiaId = req.query.materiaId ? Number(req.query.materiaId) : undefined;
  const cursoId = req.query.cursoId ? Number(req.query.cursoId) : undefined;
  const tipo = typeof req.query.tipo === 'string' ? req.query.tipo : undefined;

  try {
    const where: any = { activo: true };

    if (materiaId) {
      where.OR = [
        { materiaId },
        ...(cursoId ? [{ cursoId, materiaId: null }] : [])
      ];
    } else if (cursoId) {
      where.cursoId = cursoId;
    }

    if (tipo && TIPOS_VALIDOS.includes(tipo)) {
      where.tipo = tipo;
    }

    const recursos = await prisma.recursoDidactico.findMany({
      where,
      include: {
        autor: {
          select: { id: true, nombre: true, apellido: true, rol: true }
        },
        materia: {
          select: { id: true, nombre: true }
        },
        curso: {
          select: { id: true, ramaArtesanal: true, anioFormativo: true }
        }
      },
      orderBy: { creadoEn: 'desc' }
    });

    res.json(recursos);
  } catch (error) {
    console.error('Error al listar recursos didácticos:', error);
    res.status(500).json({ error: 'Error al obtener los recursos didácticos' });
  }
};

// POST /api/recursos
export const crearRecurso = async (req: any, res: Response) => {
  const { titulo, descripcion, tipo, urlRecurso, archivoNombre, cursoId, materiaId } = req.body;

  if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
    return res.status(400).json({ error: 'El título del recurso es obligatorio' });
  }

  if (!urlRecurso || typeof urlRecurso !== 'string' || !urlRecurso.trim()) {
    return res.status(400).json({ error: 'El enlace o URL del recurso es obligatorio' });
  }

  const tipoFinal = TIPOS_VALIDOS.includes(tipo) ? tipo : 'GUIA_TALLER';
  const cId = cursoId ? Number(cursoId) : null;
  const mId = materiaId ? Number(materiaId) : null;

  try {
    const recurso = await prisma.recursoDidactico.create({
      data: {
        titulo: titulo.trim(),
        descripcion: descripcion ? String(descripcion).trim() : null,
        tipo: tipoFinal,
        urlRecurso: urlRecurso.trim(),
        archivoNombre: archivoNombre ? String(archivoNombre).trim() : null,
        cursoId: cId,
        materiaId: mId,
        autorId: Number(req.usuario.id),
        activo: true
      },
      include: {
        autor: { select: { id: true, nombre: true, apellido: true, rol: true } },
        materia: { select: { id: true, nombre: true } },
        curso: { select: { id: true, ramaArtesanal: true, anioFormativo: true } }
      }
    });

    res.status(201).json({
      message: 'Recurso didáctico publicado exitosamente',
      recurso
    });
  } catch (error) {
    console.error('Error al crear recurso didáctico:', error);
    res.status(500).json({ error: 'Error al publicar el recurso' });
  }
};

// DELETE /api/recursos/:id
export const eliminarRecurso = async (req: any, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identificador inválido' });
  }

  try {
    const recurso = await prisma.recursoDidactico.findUnique({
      where: { id },
      select: { id: true, autorId: true }
    });

    if (!recurso) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    if (req.usuario.rol !== 'ADMIN' && recurso.autorId !== Number(req.usuario.id)) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este recurso' });
    }

    await prisma.recursoDidactico.update({
      where: { id },
      data: { activo: false }
    });

    res.json({ message: 'Recurso eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar recurso:', error);
    res.status(500).json({ error: 'Error al eliminar el recurso' });
  }
};
