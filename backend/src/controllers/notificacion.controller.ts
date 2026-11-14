import { Response } from 'express';
import prisma from '../lib/prisma';

export interface ItemNotificacion {
  id: string;
  tipo: 'MENSAJE' | 'ANUNCIO' | 'TAREA' | 'PROSPECTO';
  titulo: string;
  subtitulo: string;
  detalle?: string;
  ruta: string;
  fecha: Date;
  leido: boolean;
  icono: string;
}

export const obtenerResumenNotificaciones = async (req: any, res: Response) => {
  const usuarioId = Number(req.usuario.id);
  const rol = req.usuario.rol;

  try {
    const items: ItemNotificacion[] = [];

    // 1. Mensajes Internos no leídos para este usuario
    const mensajesNoLeidos = await prisma.mensajeInterno.findMany({
      where: {
        destinatarioId: usuarioId,
        leido: false
      },
      include: {
        remitente: {
          select: { nombre: true, apellido: true, rol: true }
        },
        materia: {
          select: { nombre: true }
        }
      },
      orderBy: { creadoEn: 'desc' },
      take: 5
    });

    for (const m of mensajesNoLeidos) {
      const remitenteRol = m.remitente.rol === 'ADMIN' ? 'Secretaría / Admin' : m.remitente.rol === 'PROFESOR' ? 'Docente' : 'Estudiante';
      const materiaTxt = m.materia?.nombre ? ` (${m.materia.nombre})` : '';
      items.push({
        id: `msg-${m.id}`,
        tipo: 'MENSAJE',
        titulo: `Mensaje de ${m.remitente.nombre} ${m.remitente.apellido}`,
        subtitulo: `${remitenteRol}${materiaTxt}`,
        detalle: m.contenido.length > 70 ? `${m.contenido.slice(0, 67)}...` : m.contenido,
        ruta: '/chat',
        fecha: m.creadoEn,
        leido: false,
        icono: 'forum'
      });
    }

    // 2. Anuncios institucionales recientes (últimos 7 días)
    const fechaLimiteAnuncios = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const anunciosRecientes = await prisma.anuncio.findMany({
      where: {
        activo: true,
        createdAt: { gte: fechaLimiteAnuncios }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    for (const a of anunciosRecientes) {
      items.push({
        id: `anc-${a.id}`,
        tipo: 'ANUNCIO',
        titulo: a.titulo,
        subtitulo: `Anuncio oficial · ${a.autorNombre || 'Dirección'}`,
        detalle: a.contenido && a.contenido.length > 70 ? `${a.contenido.slice(0, 67)}...` : (a.contenido || ''),
        ruta: rol === 'ADMIN' ? '/dashboard' : rol === 'PROFESOR' ? '/profesor' : '/estudiante',
        fecha: a.createdAt,
        leido: true,
        icono: 'campaign'
      });
    }

    // 3. Notificaciones específicas por rol
    if (rol === 'ESTUDIANTE') {
      const matricula = await prisma.matricula.findFirst({
        where: { usuarioId, activo: true },
        select: { id: true, cursoId: true }
      });

      if (matricula) {
        const ahora = new Date();
        const enSieteDias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const tareasProximas = await prisma.tarea.findMany({
          where: {
            materia: { cursoId: matricula.cursoId },
            fechaFin: { gte: ahora, lte: enSieteDias }
          },
          include: {
            materia: { select: { nombre: true } }
          },
          orderBy: { fechaFin: 'asc' },
          take: 3
        });

        for (const t of tareasProximas) {
          items.push({
            id: `tar-${t.id}`,
            tipo: 'TAREA',
            titulo: `Tarea por entregar: ${t.nombre}`,
            subtitulo: `${t.materia.nombre}`,
            detalle: `Vence el ${new Date(t.fechaFin).toLocaleDateString('es-EC')}`,
            ruta: '/estudiante/aula-virtual',
            fecha: t.fechaFin,
            leido: false,
            icono: 'assignment'
          });
        }
      }
    } else if (rol === 'ADMIN') {
      const prospectosCount = await prisma.posibleMatricula.count({
        where: { estado: 'PENDIENTE' }
      });

      if (prospectosCount > 0) {
        items.push({
          id: 'prospectos-pendientes',
          tipo: 'PROSPECTO',
          titulo: `${prospectosCount} prospecto(s) web pendiente(s)`,
          subtitulo: 'Portal público · Solicitudes de admisión',
          detalle: 'Personas interesadas esperando contacto en secretaría.',
          ruta: '/portal-web/prospectos',
          fecha: new Date(),
          leido: false,
          icono: 'contact_page'
        });
      }
    }

    items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    const conteoNoLeidos = items.filter(i => !i.leido).length;

    res.json({
      conteoTotal: conteoNoLeidos,
      totalMensajesNoLeidos: mensajesNoLeidos.length,
      items
    });
  } catch (error) {
    console.error('Error al obtener resumen de notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};
