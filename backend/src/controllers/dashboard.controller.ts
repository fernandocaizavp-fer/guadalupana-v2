import { Response } from 'express';
import prisma from '../lib/prisma';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_SERIE = 6;

const num = (d: any) => Number(d ?? 0);

// GET /api/dashboard/resumen
// Indicadores y series del panel del administrador, en una sola ida a la base
// (todas las consultas en paralelo). Es de solo lectura: la mora se calcula por
// fecha en lugar de escribirla, a diferencia de marcarMora en finanzas.
export const obtenerResumen = async (_req: any, res: Response) => {
  try {
    const hoy = new Date();
    const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioSerie = new Date(hoy.getFullYear(), hoy.getMonth() - (MESES_SERIE - 1), 1);
    const noPagada = { estado: { not: 'PAGADA' as const } };

    const [
      estudiantes,
      cursos,
      docentes,
      comprobantesPendientes,
      prospectosPendientes,
      recaudado,
      porCobrar,
      vencidas,
      deudasPagadas,
      deudasAlDia,
      pagosSerie,
      porCurso
    ] = await Promise.all([
      prisma.matricula.count({ where: { activo: true } }),
      prisma.curso.count({ where: { activo: true } }),
      prisma.usuario.count({ where: { rol: 'PROFESOR', activo: true } }),
      prisma.comprobante.count({ where: { estado: 'EN_REVISION' } }),
      prisma.posibleMatricula.count({ where: { estado: 'PENDIENTE' } }),
      prisma.comprobante.aggregate({ where: { estado: 'APROBADO' }, _sum: { montoAbonado: true } }),
      prisma.deuda.aggregate({ where: noPagada, _sum: { saldo: true } }),
      prisma.deuda.aggregate({
        where: { ...noPagada, fechaMaxima: { lt: inicioDeHoy } },
        _count: true,
        _sum: { saldo: true }
      }),
      prisma.deuda.count({ where: { estado: 'PAGADA' } }),
      prisma.deuda.count({ where: { ...noPagada, fechaMaxima: { gte: inicioDeHoy } } }),
      // Comprobante no guarda la fecha de aprobación: se agrupa por fechaSubida
      // (exacta para pagos manuales, aproximada para comprobantes subidos).
      prisma.comprobante.findMany({
        where: { estado: 'APROBADO', fechaSubida: { gte: inicioSerie } },
        select: { fechaSubida: true, montoAbonado: true }
      }),
      prisma.curso.findMany({
        where: { activo: true },
        select: {
          id: true,
          ramaArtesanal: true,
          anioFormativo: true,
          _count: { select: { matriculas: { where: { activo: true } } } }
        },
        orderBy: { ramaArtesanal: 'asc' }
      })
    ]);

    // Serie mensual con los meses sin pagos en 0, para que el gráfico no tenga huecos.
    const recaudacionMensual = Array.from({ length: MESES_SERIE }, (_, i) => {
      const fecha = new Date(inicioSerie.getFullYear(), inicioSerie.getMonth() + i, 1);
      return { anio: fecha.getFullYear(), mes: fecha.getMonth(), etiqueta: MESES_CORTOS[fecha.getMonth()], total: 0 };
    });
    for (const p of pagosSerie) {
      const f = p.fechaSubida;
      const punto = recaudacionMensual.find((m) => m.anio === f.getFullYear() && m.mes === f.getMonth());
      if (punto) punto.total += num(p.montoAbonado);
    }

    res.json({
      kpis: {
        estudiantes,
        cursos,
        docentes,
        comprobantesPendientes,
        prospectosPendientes,
        recaudado: num(recaudado._sum.montoAbonado),
        porCobrar: num(porCobrar._sum.saldo),
        deudasEnMora: vencidas._count,
        montoEnMora: num(vencidas._sum.saldo)
      },
      recaudacionMensual: recaudacionMensual.map(({ etiqueta, total }) => ({
        etiqueta,
        total: Math.round(total * 100) / 100
      })),
      estadoCartera: [
        { etiqueta: 'Pagadas', valor: deudasPagadas },
        { etiqueta: 'Al día', valor: deudasAlDia },
        { etiqueta: 'En mora', valor: vencidas._count }
      ],
      estudiantesPorCurso: porCurso.map((c) => ({
        cursoId: c.id,
        etiqueta: `${c.ramaArtesanal} ${c.anioFormativo}`.trim(),
        valor: c._count.matriculas
      }))
    });
  } catch (error) {
    console.error('Error al obtener el resumen del panel:', error);
    res.status(500).json({ error: 'Error al obtener el resumen del panel' });
  }
};

// GET /api/dashboard/profesor
// Indicadores del panel del docente que inició sesión: solo sus materias
// (docente asignado o docente principal).
export const obtenerResumenProfesor = async (req: any, res: Response) => {
  try {
    const profesorId = Number(req.usuario?.id);
    const materias = await prisma.materia.findMany({
      where: { OR: [{ profesorId }, { profesorPrincipalId: profesorId }] },
      select: { id: true, cursoId: true }
    });
    const materiaIds = materias.map((m) => m.id);
    const cursoIds = [...new Set(materias.map((m) => m.cursoId))];

    if (materiaIds.length === 0) {
      return res.json({ materias: 0, cursos: 0, estudiantes: 0, porCalificar: 0, tareasActivas: 0, asistenciasSemana: 0 });
    }

    // Lunes de esta semana a las 00:00.
    const hoy = new Date();
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));

    const [estudiantes, tareasActivas, asistenciasSemana, entregas] = await Promise.all([
      prisma.matricula.count({ where: { cursoId: { in: cursoIds }, activo: true } }),
      prisma.tarea.count({ where: { materiaId: { in: materiaIds }, fechaFin: { gte: hoy } } }),
      prisma.asistencia.count({ where: { materiaId: { in: materiaIds }, fecha: { gte: lunes } } }),
      prisma.entregaTarea.findMany({
        where: { tarea: { materiaId: { in: materiaIds } }, matricula: { activo: true } },
        select: { tareaId: true, matriculaId: true }
      })
    ]);

    // Entregas sin nota: no hay relación directa EntregaTarea → NotaTarea, se cruzan por par.
    const calificadas = entregas.length
      ? await prisma.notaTarea.findMany({
          where: { tareaId: { in: [...new Set(entregas.map((e) => e.tareaId))] }, valor: { not: null } },
          select: { tareaId: true, matriculaId: true }
        })
      : [];
    const conNota = new Set(calificadas.map((n) => `${n.tareaId}|${n.matriculaId}`));
    const porCalificar = entregas.filter((e) => !conNota.has(`${e.tareaId}|${e.matriculaId}`)).length;

    res.json({
      materias: materiaIds.length,
      cursos: cursoIds.length,
      estudiantes,
      porCalificar,
      tareasActivas,
      asistenciasSemana
    });
  } catch (error) {
    console.error('Error al obtener el resumen del docente:', error);
    res.status(500).json({ error: 'Error al obtener el resumen del docente' });
  }
};
