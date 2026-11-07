import { Response } from 'express';
import prisma from '../lib/prisma';

const POR_PAGINA = 25;

// GET /api/auditoria?entidad=NotaTarea&accion=UPDATE&desde=2026-11-01&hasta=2026-11-07&pagina=1
// Historial de movimientos, del más reciente al más antiguo, con el nombre de
// quien hizo cada cambio.
export const listarAuditoria = async (req: any, res: Response) => {
  try {
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const where: any = {};
    if (req.query.entidad) where.entidad = String(req.query.entidad);
    if (req.query.accion) where.accion = String(req.query.accion);
    if (req.query.usuarioId) where.usuarioId = Number(req.query.usuarioId);

    const desde = req.query.desde ? new Date(String(req.query.desde)) : null;
    const hasta = req.query.hasta ? new Date(String(req.query.hasta)) : null;
    if (desde && !isNaN(+desde)) where.fecha = { ...where.fecha, gte: desde };
    if (hasta && !isNaN(+hasta)) {
      hasta.setDate(hasta.getDate() + 1); // incluye todo el día "hasta"
      where.fecha = { ...where.fecha, lt: hasta };
    }

    const [total, registros, entidades] = await Promise.all([
      prisma.auditoria.count({ where }),
      prisma.auditoria.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA
      }),
      prisma.auditoria.findMany({ distinct: ['entidad'], select: { entidad: true }, orderBy: { entidad: 'asc' } })
    ]);

    const ids = [...new Set(registros.map((r) => r.usuarioId).filter((id): id is number => id !== null))];
    const usuarios = ids.length
      ? await prisma.usuario.findMany({
          where: { id: { in: ids } },
          select: { id: true, nombre: true, apellido: true }
        })
      : [];
    const nombre = new Map(usuarios.map((u) => [u.id, `${u.nombre} ${u.apellido}`.trim()]));

    res.json({
      total,
      pagina,
      porPagina: POR_PAGINA,
      entidades: entidades.map((e) => e.entidad),
      registros: registros.map((r) => ({
        ...r,
        usuarioNombre: r.usuarioId ? nombre.get(r.usuarioId) ?? `Usuario #${r.usuarioId}` : 'Sistema'
      }))
    });
  } catch (error) {
    console.error('Error al listar la auditoría:', error);
    res.status(500).json({ error: 'Error al obtener el historial de movimientos' });
  }
};
