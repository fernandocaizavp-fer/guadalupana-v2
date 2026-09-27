import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import multer from 'multer';
import { subirArchivo } from '../lib/cloudinary';

// La imagen del anuncio se sube a Cloudinary (no a disco: Railway borra los
// archivos en cada redeploy). Se guarda en memoria y luego se sube.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const tipos = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (tipos.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

export const crearAnuncio = async (req: any, res: Response) => {
  const { titulo, contenido, materiaNombre, cursoId } = req.body;
  try {
    // Sube la imagen a Cloudinary y guarda la URL completa (permanente).
    const imagen = req.file
      ? (await subirArchivo(req.file.buffer, req.file.originalname, 'cf_guadalupana/anuncios')).url
      : null;
    // El autor se deriva del usuario autenticado (token), no del body.
    // El JWT solo trae { id, rol }, por eso consultamos el nombre.
    const autorRol = req.usuario?.rol ?? null;
    const autor = await prisma.usuario.findUnique({
      where: { id: req.usuario?.id },
      select: { nombre: true, apellido: true }
    });
    const autorNombre = autor ? `${autor.nombre} ${autor.apellido}` : null;

    const anuncio = await prisma.anuncio.create({
      data: {
        titulo, contenido, imagen, autorRol, autorNombre,
        autorId: req.usuario?.id ?? null,
        materiaNombre: materiaNombre || null,
        cursoId: cursoId ? Number(cursoId) : null
      }
    });
    res.json({ message: 'Anuncio creado', anuncio });
  } catch (error) {
    console.error('[anuncio] crearAnuncio falló:', error);
    res.status(500).json({ error: 'Error al crear anuncio' });
  }
};

export const listarAnuncios = async (req: any, res: Response) => {
  try {
    // Los estudiantes solo ven los anuncios de su curso + los generales (sin
    // curso). Docentes y admin ven todos los activos (para gestionarlos).
    let where: any = { activo: true };
    if (req.usuario?.rol === 'ESTUDIANTE') {
      const matricula = await prisma.matricula.findUnique({
        where: { usuarioId: req.usuario.id },
        select: { cursoId: true }
      });
      where = {
        activo: true,
        OR: [{ cursoId: null }, { cursoId: matricula?.cursoId ?? -1 }]
      };
    }
    const anuncios = await prisma.anuncio.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(anuncios);
  } catch (error) {
    console.error('[anuncio] listarAnuncios falló:', error);
    res.status(500).json({ error: 'Error al listar anuncios' });
  }
};

export const listarTodosAnuncios = async (req: Request, res: Response) => {
  try {
    const anuncios = await prisma.anuncio.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(anuncios);
  } catch (error) {
    console.error('[anuncio] listarTodosAnuncios falló:', error);
    res.status(500).json({ error: 'Error al listar anuncios' });
  }
};

export const actualizarAnuncio = async (req: any, res: Response) => {
  const { id } = req.params;
  const { titulo, contenido, activo, materiaNombre, cursoId } = req.body;
  try {
    const existente = await prisma.anuncio.findUnique({ where: { id: Number(id) } });
    if (!existente) return res.status(404).json({ error: 'Anuncio no encontrado' });
    // Un PROFESOR solo puede editar sus propios anuncios; el ADMIN, todos.
    if (req.usuario?.rol !== 'ADMIN' && existente.autorId !== req.usuario?.id) {
      return res.status(403).json({ error: 'No puedes modificar un anuncio que no es tuyo' });
    }
    const data: any = {
      titulo,
      contenido,
      activo: activo === 'true' || activo === true,
      materiaNombre: materiaNombre || null,
      cursoId: cursoId ? Number(cursoId) : null
    };
    if (req.file) {
      data.imagen = (await subirArchivo(req.file.buffer, req.file.originalname, 'cf_guadalupana/anuncios')).url;
    }
    const anuncio = await prisma.anuncio.update({
      where: { id: Number(id) },
      data
    });
    res.json({ message: 'Anuncio actualizado', anuncio });
  } catch (error) {
    console.error('[anuncio] actualizarAnuncio falló:', error);
    res.status(500).json({ error: 'Error al actualizar anuncio' });
  }
};

export const eliminarAnuncio = async (req: any, res: Response) => {
  try {
    const existente = await prisma.anuncio.findUnique({ where: { id: Number(req.params.id) } });
    if (!existente) return res.status(404).json({ error: 'Anuncio no encontrado' });
    // Un PROFESOR solo puede eliminar sus propios anuncios; el ADMIN, todos.
    if (req.usuario?.rol !== 'ADMIN' && existente.autorId !== req.usuario?.id) {
      return res.status(403).json({ error: 'No puedes eliminar un anuncio que no es tuyo' });
    }
    await prisma.anuncio.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Anuncio eliminado' });
  } catch (error) {
    console.error('[anuncio] eliminarAnuncio falló:', error);
    res.status(500).json({ error: 'Error al eliminar anuncio' });
  }
};