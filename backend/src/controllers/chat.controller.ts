import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const conteoNoLeidos = async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const count = await prisma.mensajeInterno.count({
      where: {
        destinatarioId: usuarioId,
        leido: false
      }
    });
    res.json({ count });
  } catch (error) {
    console.error('Error al contar no leídos:', error);
    res.status(500).json({ error: 'Error al obtener mensajes no leídos' });
  }
};

export const listarContactos = async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const usuarioRol = (req as any).usuario.rol;

    let contactosIds: number[] = [];
    const infoMateriaPorContacto = new Map<number, string>();

    // 1. Administrador: todos los docentes y estudiantes activos
    if (usuarioRol === 'ADMIN') {
      const usuarios = await prisma.usuario.findMany({
        where: {
          id: { not: usuarioId },
          activo: true
        },
        select: { id: true }
      });
      contactosIds = usuarios.map(u => u.id);
    }
    // 2. Estudiante: sus docentes asignados y los administradores
    else if (usuarioRol === 'ESTUDIANTE') {
      const matricula = await prisma.matricula.findFirst({
        where: { usuarioId, activo: true },
        include: {
          curso: {
            include: {
              materias: {
                where: { activo: true },
                include: {
                  profesor: true,
                  profesorPrincipal: true
                }
              }
            }
          }
        }
      });

      if (matricula && matricula.curso) {
        matricula.curso.materias.forEach(m => {
          if (m.profesorId && m.profesor?.activo) {
            contactosIds.push(m.profesorId);
            infoMateriaPorContacto.set(m.profesorId, m.nombre);
          }
          if (m.profesorPrincipalId && m.profesorPrincipal?.activo) {
            contactosIds.push(m.profesorPrincipalId);
            if (!infoMateriaPorContacto.has(m.profesorPrincipalId)) {
              infoMateriaPorContacto.set(m.profesorPrincipalId, `${m.nombre} (Principal)`);
            }
          }
        });
      }

      // Añadir administradores
      const admins = await prisma.usuario.findMany({
        where: { rol: 'ADMIN', activo: true },
        select: { id: true }
      });
      admins.forEach(a => contactosIds.push(a.id));
    }
    // 3. Docente: sus estudiantes y los administradores
    else if (usuarioRol === 'PROFESOR') {
      // Materias donde es profesor o profesor principal
      const materias = await prisma.materia.findMany({
        where: {
          OR: [
            { profesorId: usuarioId },
            { profesorPrincipalId: usuarioId }
          ],
          activo: true
        },
        include: {
          curso: {
            include: {
              matriculas: {
                where: { activo: true },
                include: { usuario: true }
              }
            }
          }
        }
      });

      materias.forEach(m => {
        if (m.curso) {
          m.curso.matriculas.forEach(mat => {
            if (mat.usuario && mat.usuario.activo) {
              contactosIds.push(mat.usuario.id);
              infoMateriaPorContacto.set(mat.usuario.id, `${m.curso.ramaArtesanal} - ${m.nombre}`);
            }
          });
        }
      });

      // Añadir administradores
      const admins = await prisma.usuario.findMany({
        where: { rol: 'ADMIN', activo: true },
        select: { id: true }
      });
      admins.forEach(a => contactosIds.push(a.id));
    }

    // Contactos únicos
    const uniqueIds = Array.from(new Set(contactosIds));
    if (uniqueIds.length === 0) {
      return res.json([]);
    }

    const contactos = await prisma.usuario.findMany({
      where: {
        id: { in: uniqueIds },
        activo: true
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        rol: true,
        fotoUrl: true,
        correo: true
      }
    });

    // Obtener el último mensaje y el conteo de no leídos para cada contacto
    const contactosConMeta = await Promise.all(
      contactos.map(async (c) => {
        const ultimoMensaje = await prisma.mensajeInterno.findFirst({
          where: {
            OR: [
              { remitenteId: usuarioId, destinatarioId: c.id },
              { remitenteId: c.id, destinatarioId: usuarioId }
            ]
          },
          orderBy: { creadoEn: 'desc' },
          select: {
            id: true,
            contenido: true,
            creadoEn: true,
            remitenteId: true,
            leido: true
          }
        });

        const noLeidos = await prisma.mensajeInterno.count({
          where: {
            remitenteId: c.id,
            destinatarioId: usuarioId,
            leido: false
          }
        });

        return {
          id: c.id,
          nombre: c.nombre,
          apellido: c.apellido,
          rol: c.rol,
          fotoUrl: c.fotoUrl,
          correo: c.correo,
          detalleMateria: infoMateriaPorContacto.get(c.id) || (c.rol === 'ADMIN' ? 'Dirección / Secretaría' : ''),
          ultimoMensaje: ultimoMensaje
            ? {
                contenido: ultimoMensaje.contenido,
                fecha: ultimoMensaje.creadoEn,
                esMio: ultimoMensaje.remitenteId === usuarioId,
                leido: ultimoMensaje.leido
              }
            : null,
          noLeidos
        };
      })
    );

    // Ordenar: primero los que tienen no leídos, luego por fecha del último mensaje más reciente
    contactosConMeta.sort((a, b) => {
      if (a.noLeidos > 0 && b.noLeidos === 0) return -1;
      if (b.noLeidos > 0 && a.noLeidos === 0) return 1;

      const fechaA = a.ultimoMensaje ? new Date(a.ultimoMensaje.fecha).getTime() : 0;
      const fechaB = b.ultimoMensaje ? new Date(b.ultimoMensaje.fecha).getTime() : 0;
      if (fechaA !== fechaB) return fechaB - fechaA;

      return (a.apellido || '').localeCompare(b.apellido || '');
    });

    res.json(contactosConMeta);
  } catch (error) {
    console.error('Error al listar contactos de chat:', error);
    res.status(500).json({ error: 'Error al obtener la lista de contactos' });
  }
};

export const obtenerConversacion = async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const contactoId = Number(req.params.contactoId);

    if (isNaN(contactoId) || contactoId === usuarioId) {
      return res.status(400).json({ error: 'Contacto inválido' });
    }

    const contacto = await prisma.usuario.findUnique({
      where: { id: contactoId, activo: true },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        rol: true,
        fotoUrl: true,
        correo: true
      }
    });

    if (!contacto) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    // Marcar como leídos los mensajes que este contacto me envió a mí
    await prisma.mensajeInterno.updateMany({
      where: {
        remitenteId: contactoId,
        destinatarioId: usuarioId,
        leido: false
      },
      data: {
        leido: true,
        fechaLectura: new Date()
      }
    });

    // Obtener los mensajes ordenados cronológicamente
    const mensajes = await prisma.mensajeInterno.findMany({
      where: {
        OR: [
          { remitenteId: usuarioId, destinatarioId: contactoId },
          { remitenteId: contactoId, destinatarioId: usuarioId }
        ]
      },
      orderBy: { creadoEn: 'asc' },
      take: 100, // Límite de los últimos 100 mensajes para máxima velocidad
      select: {
        id: true,
        contenido: true,
        leido: true,
        fechaLectura: true,
        creadoEn: true,
        remitenteId: true,
        destinatarioId: true,
        materiaId: true,
        materia: { select: { nombre: true } }
      }
    });

    res.json({
      contacto,
      mensajes: mensajes.map(m => ({
        id: m.id,
        contenido: m.contenido,
        esMio: m.remitenteId === usuarioId,
        leido: m.leido,
        fecha: m.creadoEn,
        materia: m.materia?.nombre || null
      }))
    });
  } catch (error) {
    console.error('Error al obtener conversación:', error);
    res.status(500).json({ error: 'Error al cargar mensajes' });
  }
};

export const enviarMensaje = async (req: Request, res: Response) => {
  try {
    const remitenteId = (req as any).usuario.id;
    const { destinatarioId, contenido, materiaId } = req.body;

    const texto = String(contenido || '').trim();
    if (!texto) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }
    if (texto.length > 2000) {
      return res.status(400).json({ error: 'El mensaje supera el límite de 2000 caracteres' });
    }

    const destId = Number(destinatarioId);
    if (!destId || destId === remitenteId) {
      return res.status(400).json({ error: 'Destinatario inválido' });
    }

    const destinatario = await prisma.usuario.findUnique({
      where: { id: destId, activo: true }
    });
    if (!destinatario) {
      return res.status(404).json({ error: 'Destinatario no encontrado' });
    }

    const nuevoMensaje = await prisma.mensajeInterno.create({
      data: {
        remitenteId,
        destinatarioId: destId,
        contenido: texto,
        materiaId: materiaId ? Number(materiaId) : null
      },
      select: {
        id: true,
        contenido: true,
        leido: true,
        creadoEn: true,
        remitenteId: true,
        destinatarioId: true,
        materiaId: true
      }
    });

    res.status(201).json({
      id: nuevoMensaje.id,
      contenido: nuevoMensaje.contenido,
      esMio: true,
      leido: false,
      fecha: nuevoMensaje.creadoEn
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
};
