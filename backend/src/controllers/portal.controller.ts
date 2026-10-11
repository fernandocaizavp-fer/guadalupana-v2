import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { subirArchivo, eliminarArchivo } from '../lib/r2';

// Portal público (landing page). Estas tablas no se relacionan con la gestión
// académica: `AnuncioPublico` NO es el `Anuncio` interno, y un prospecto
// (`PosibleMatricula`) no es una matrícula ni crea un usuario.
//
// Hay dos grupos de funciones: las públicas (sin token: lectura de lo publicado
// y alta de un prospecto) y las de administración (solo ADMIN).

const CARPETA_ANUNCIOS = 'cf_guadalupana/portal/anuncios';
const CARPETA_GALERIA = 'cf_guadalupana/portal/galeria';
const ESTADOS_PROSPECTO = ['PENDIENTE', 'CONTACTADO'];

function fallo(res: Response, error: unknown, contexto: string, mensaje: string) {
  console.error(`[portal] ${contexto}:`, error);
  res.status(500).json({ error: mensaje });
}

// Texto de una línea: devuelve el valor recortado o null si falta o no cabe.
function texto(valor: unknown, maximo: number, minimo = 1): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().replace(/\s+/g, ' ');
  return limpio.length >= minimo && limpio.length <= maximo ? limpio : null;
}

// Igual que `texto`, pero conserva los saltos de línea (contenido de una noticia).
function parrafo(valor: unknown, maximo: number): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio.length >= 1 && limpio.length <= maximo ? limpio : null;
}

function fecha(valor: unknown): Date | null {
  if (typeof valor !== 'string' || !valor) return null;
  const f = new Date(valor);
  return isNaN(f.getTime()) ? null : f;
}

function idDe(req: Request): number | null {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// multipart envía todo como texto: solo 'false' desactiva.
function activoDe(req: Request): boolean {
  return req.body?.activo !== 'false' && req.body?.activo !== false;
}

function inicioDeHoy(): Date {
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);
  return hoy;
}

// ══════════════ RUTAS PÚBLICAS (sin token) ══════════════

export const anunciosPublicados = async (req: Request, res: Response) => {
  try {
    const anuncios = await prisma.anuncioPublico.findMany({
      where: { activo: true },
      orderBy: { fechaPublicacion: 'desc' },
      take: 6
    });
    res.json(anuncios);
  } catch (error) {
    fallo(res, error, 'anunciosPublicados', 'Error al cargar las noticias');
  }
};

export const galeriaPublicada = async (req: Request, res: Response) => {
  try {
    const fotos = await prisma.galeriaPublica.findMany({ orderBy: { fechaSubida: 'desc' }, take: 24 });
    res.json(fotos);
  } catch (error) {
    fallo(res, error, 'galeriaPublicada', 'Error al cargar la galería');
  }
};

// Solo los eventos que no han terminado, del más próximo al más lejano.
export const calendarioPublicado = async (req: Request, res: Response) => {
  try {
    const eventos = await prisma.calendarioPublico.findMany({
      where: { fechaFin: { gte: inicioDeHoy() } },
      orderBy: { fechaInicio: 'asc' },
      take: 8
    });
    res.json(eventos);
  } catch (error) {
    fallo(res, error, 'calendarioPublicado', 'Error al cargar el calendario');
  }
};

// Único endpoint del sistema que escribe en la base sin autenticación. Por eso
// valida cada campo, ignora cualquier otro dato del body (el estado siempre
// nace PENDIENTE), descarta envíos de bots (campo trampa) y evita duplicados.
export const registrarProspecto = async (req: Request, res: Response) => {
  // Campo trampa: está oculto en el formulario y una persona nunca lo llena.
  // Se responde como si todo hubiera salido bien para no dar pistas al bot.
  if (req.body?.sitioWeb) return res.status(201).json({ message: 'Solicitud registrada' });

  const nombres = texto(req.body?.nombres, 100, 2);
  const apellidos = texto(req.body?.apellidos, 100, 2);
  const especialidadInteres = texto(req.body?.especialidadInteres, 100, 2);
  const telefono = typeof req.body?.telefono === 'string' ? req.body.telefono.replace(/[\s-]/g, '') : '';

  if (!nombres || !apellidos) {
    return res.status(400).json({ error: 'Escribe tus nombres y apellidos' });
  }
  if (!/^\+?\d{7,15}$/.test(telefono)) {
    return res.status(400).json({ error: 'Escribe un número de teléfono válido' });
  }
  if (!especialidadInteres) {
    return res.status(400).json({ error: 'Elige la especialidad que te interesa' });
  }

  try {
    // Si la misma persona reenvía el formulario mientras su solicitud sigue
    // pendiente, no se crea otra fila.
    const repetido = await prisma.posibleMatricula.findFirst({
      where: { telefono, especialidadInteres, estado: 'PENDIENTE' }
    });
    if (!repetido) {
      await prisma.posibleMatricula.create({ data: { nombres, apellidos, telefono, especialidadInteres } });
    }
    res.status(201).json({ message: 'Solicitud registrada' });
  } catch (error) {
    fallo(res, error, 'registrarProspecto', 'No se pudo registrar tu solicitud. Inténtalo más tarde');
  }
};

// ══════════════ ADMINISTRACIÓN (solo ADMIN) ══════════════

// ── Prospectos ──

export const listarProspectos = async (req: Request, res: Response) => {
  try {
    const prospectos = await prisma.posibleMatricula.findMany({
      orderBy: [{ estado: 'asc' }, { fechaRegistro: 'desc' }]
    });
    res.json(prospectos);
  } catch (error) {
    fallo(res, error, 'listarProspectos', 'Error al listar los prospectos');
  }
};

export const contarProspectosPendientes = async (req: Request, res: Response) => {
  try {
    res.json(await prisma.posibleMatricula.count({ where: { estado: 'PENDIENTE' } }));
  } catch (error) {
    fallo(res, error, 'contarProspectosPendientes', 'Error al contar los prospectos');
  }
};

// El administrador también puede anotar a alguien que llamó o llegó en persona.
export const crearProspecto = async (req: Request, res: Response) => {
  const nombres = texto(req.body?.nombres, 100, 2);
  const apellidos = texto(req.body?.apellidos, 100, 2);
  const telefono = texto(req.body?.telefono, 20, 7);
  const especialidadInteres = texto(req.body?.especialidadInteres, 100, 2);
  if (!nombres || !apellidos || !telefono || !especialidadInteres) {
    return res.status(400).json({ error: 'Nombres, apellidos, teléfono y especialidad son obligatorios' });
  }
  try {
    const prospecto = await prisma.posibleMatricula.create({
      data: { nombres, apellidos, telefono, especialidadInteres }
    });
    res.status(201).json(prospecto);
  } catch (error) {
    fallo(res, error, 'crearProspecto', 'Error al registrar el prospecto');
  }
};

export const cambiarEstadoProspecto = async (req: Request, res: Response) => {
  const id = idDe(req);
  const { estado } = req.body;
  if (!id) return res.status(400).json({ error: 'Identificador no válido' });
  if (!ESTADOS_PROSPECTO.includes(estado)) {
    return res.status(400).json({ error: 'El estado debe ser PENDIENTE o CONTACTADO' });
  }
  try {
    const cambiado = await prisma.posibleMatricula.updateMany({ where: { id }, data: { estado } });
    if (cambiado.count === 0) return res.status(404).json({ error: 'Prospecto no encontrado' });
    res.json({ message: 'Estado actualizado' });
  } catch (error) {
    fallo(res, error, 'cambiarEstadoProspecto', 'Error al actualizar el prospecto');
  }
};

export const eliminarProspecto = async (req: Request, res: Response) => {
  const id = idDe(req);
  if (!id) return res.status(400).json({ error: 'Identificador no válido' });
  try {
    const borrado = await prisma.posibleMatricula.deleteMany({ where: { id } });
    if (borrado.count === 0) return res.status(404).json({ error: 'Prospecto no encontrado' });
    res.json({ message: 'Prospecto eliminado' });
  } catch (error) {
    fallo(res, error, 'eliminarProspecto', 'Error al eliminar el prospecto');
  }
};

// ── Anuncios a terceros ──

export const listarAnunciosPublicos = async (req: Request, res: Response) => {
  try {
    res.json(await prisma.anuncioPublico.findMany({ orderBy: { fechaPublicacion: 'desc' } }));
  } catch (error) {
    fallo(res, error, 'listarAnunciosPublicos', 'Error al listar los anuncios');
  }
};

export const crearAnuncioPublico = async (req: Request, res: Response) => {
  const titulo = texto(req.body?.titulo, 150);
  const contenido = parrafo(req.body?.contenido, 5000);
  if (!titulo || !contenido) {
    return res.status(400).json({ error: 'El título y el contenido son obligatorios' });
  }
  let imagenUrl: string | null = null;
  try {
    if (req.file) {
      imagenUrl = (await subirArchivo(req.file.buffer, req.file.originalname, CARPETA_ANUNCIOS, req.file.mimetype)).url;
    }
    const anuncio = await prisma.anuncioPublico.create({
      data: { titulo, contenido, imagenUrl, activo: activoDe(req) }
    });
    res.status(201).json(anuncio);
  } catch (error) {
    // Si la base falla, la imagen ya subida quedaría huérfana en el bucket.
    if (imagenUrl) await eliminarArchivo(imagenUrl);
    fallo(res, error, 'crearAnuncioPublico', 'Error al crear el anuncio');
  }
};

export const actualizarAnuncioPublico = async (req: Request, res: Response) => {
  const id = idDe(req);
  if (!id) return res.status(400).json({ error: 'Identificador no válido' });
  const titulo = texto(req.body?.titulo, 150);
  const contenido = parrafo(req.body?.contenido, 5000);
  if (!titulo || !contenido) {
    return res.status(400).json({ error: 'El título y el contenido son obligatorios' });
  }
  let nuevaUrl: string | null = null;
  try {
    const actual = await prisma.anuncioPublico.findUnique({ where: { id } });
    if (!actual) return res.status(404).json({ error: 'Anuncio no encontrado' });

    if (req.file) {
      nuevaUrl = (await subirArchivo(req.file.buffer, req.file.originalname, CARPETA_ANUNCIOS, req.file.mimetype)).url;
    }
    const quitarImagen = req.body?.quitarImagen === 'true' && !nuevaUrl;
    const anuncio = await prisma.anuncioPublico.update({
      where: { id },
      data: {
        titulo,
        contenido,
        activo: activoDe(req),
        ...(nuevaUrl ? { imagenUrl: nuevaUrl } : quitarImagen ? { imagenUrl: null } : {})
      }
    });
    // La imagen anterior se borra solo cuando el cambio ya quedó guardado.
    if ((nuevaUrl || quitarImagen) && actual.imagenUrl) await eliminarArchivo(actual.imagenUrl);
    res.json(anuncio);
  } catch (error) {
    if (nuevaUrl) await eliminarArchivo(nuevaUrl);
    fallo(res, error, 'actualizarAnuncioPublico', 'Error al actualizar el anuncio');
  }
};

export const eliminarAnuncioPublico = async (req: Request, res: Response) => {
  const id = idDe(req);
  if (!id) return res.status(400).json({ error: 'Identificador no válido' });
  try {
    const actual = await prisma.anuncioPublico.findUnique({ where: { id } });
    if (!actual) return res.status(404).json({ error: 'Anuncio no encontrado' });
    await prisma.anuncioPublico.delete({ where: { id } });
    if (actual.imagenUrl) await eliminarArchivo(actual.imagenUrl);
    res.json({ message: 'Anuncio eliminado' });
  } catch (error) {
    fallo(res, error, 'eliminarAnuncioPublico', 'Error al eliminar el anuncio');
  }
};

// ── Galería web ──

export const listarGaleria = async (req: Request, res: Response) => {
  try {
    res.json(await prisma.galeriaPublica.findMany({ orderBy: { fechaSubida: 'desc' } }));
  } catch (error) {
    fallo(res, error, 'listarGaleria', 'Error al listar la galería');
  }
};

export const subirFotoGaleria = async (req: Request, res: Response) => {
  const titulo = texto(req.body?.titulo, 150);
  if (!titulo) return res.status(400).json({ error: 'Escribe un título para la foto' });
  if (!req.file) return res.status(400).json({ error: 'Selecciona una imagen' });

  let imagenUrl: string | null = null;
  try {
    imagenUrl = (await subirArchivo(req.file.buffer, req.file.originalname, CARPETA_GALERIA, req.file.mimetype)).url;
    const foto = await prisma.galeriaPublica.create({ data: { titulo, imagenUrl } });
    res.status(201).json(foto);
  } catch (error) {
    if (imagenUrl) await eliminarArchivo(imagenUrl);
    fallo(res, error, 'subirFotoGaleria', 'Error al subir la foto');
  }
};

export const renombrarFotoGaleria = async (req: Request, res: Response) => {
  const id = idDe(req);
  const titulo = texto(req.body?.titulo, 150);
  if (!id) return res.status(400).json({ error: 'Identificador no válido' });
  if (!titulo) return res.status(400).json({ error: 'Escribe un título para la foto' });
  try {
    const cambiada = await prisma.galeriaPublica.updateMany({ where: { id }, data: { titulo } });
    if (cambiada.count === 0) return res.status(404).json({ error: 'Foto no encontrada' });
    res.json({ message: 'Título actualizado' });
  } catch (error) {
    fallo(res, error, 'renombrarFotoGaleria', 'Error al actualizar la foto');
  }
};

export const eliminarFotoGaleria = async (req: Request, res: Response) => {
  const id = idDe(req);
  if (!id) return res.status(400).json({ error: 'Identificador no válido' });
  try {
    const actual = await prisma.galeriaPublica.findUnique({ where: { id } });
    if (!actual) return res.status(404).json({ error: 'Foto no encontrada' });
    await prisma.galeriaPublica.delete({ where: { id } });
    await eliminarArchivo(actual.imagenUrl);
    res.json({ message: 'Foto eliminada' });
  } catch (error) {
    fallo(res, error, 'eliminarFotoGaleria', 'Error al eliminar la foto');
  }
};

// ── Calendario público ──

// Lee y valida un evento del body; si no sirve, responde el error y devuelve null.
function eventoDe(req: Request, res: Response) {
  const titulo = texto(req.body?.titulo, 150);
  const fechaInicio = fecha(req.body?.fechaInicio);
  // Un evento de un solo día puede llegar sin fecha de fin.
  const fechaFin = req.body?.fechaFin ? fecha(req.body.fechaFin) : fechaInicio;
  const descripcion = req.body?.descripcion ? parrafo(req.body.descripcion, 2000) : null;

  if (!titulo) {
    res.status(400).json({ error: 'El título es obligatorio' });
    return null;
  }
  if (!fechaInicio || !fechaFin) {
    res.status(400).json({ error: 'Las fechas no son válidas' });
    return null;
  }
  if (fechaFin < fechaInicio) {
    res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la de inicio' });
    return null;
  }
  return { titulo, fechaInicio, fechaFin, descripcion };
}

export const listarCalendario = async (req: Request, res: Response) => {
  try {
    res.json(await prisma.calendarioPublico.findMany({ orderBy: { fechaInicio: 'desc' } }));
  } catch (error) {
    fallo(res, error, 'listarCalendario', 'Error al listar el calendario');
  }
};

export const crearEvento = async (req: Request, res: Response) => {
  const data = eventoDe(req, res);
  if (!data) return;
  try {
    res.status(201).json(await prisma.calendarioPublico.create({ data }));
  } catch (error) {
    fallo(res, error, 'crearEvento', 'Error al crear el evento');
  }
};

export const actualizarEvento = async (req: Request, res: Response) => {
  const id = idDe(req);
  if (!id) return res.status(400).json({ error: 'Identificador no válido' });
  const data = eventoDe(req, res);
  if (!data) return;
  try {
    const cambiado = await prisma.calendarioPublico.updateMany({ where: { id }, data });
    if (cambiado.count === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json({ message: 'Evento actualizado' });
  } catch (error) {
    fallo(res, error, 'actualizarEvento', 'Error al actualizar el evento');
  }
};

export const eliminarEvento = async (req: Request, res: Response) => {
  const id = idDe(req);
  if (!id) return res.status(400).json({ error: 'Identificador no válido' });
  try {
    const borrado = await prisma.calendarioPublico.deleteMany({ where: { id } });
    if (borrado.count === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json({ message: 'Evento eliminado' });
  } catch (error) {
    fallo(res, error, 'eliminarEvento', 'Error al eliminar el evento');
  }
};
