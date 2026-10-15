import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { subirArchivo, eliminarArchivo } from '../lib/r2';

const CARPETA_COMPROBANTES = 'cf_guadalupana/comprobantes';

// Error de regla de negocio: lanzarlo dentro de $transaction revierte todo y
// conserva el código HTTP que debe ver el cliente.
class ErrorNegocio extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje);
  }
}

function responderError(res: Response, error: unknown, contexto: string, mensaje: string) {
  if (error instanceof ErrorNegocio) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(contexto, error);
  res.status(500).json({ error: mensaje });
}

// Multer decodifica el nombre del archivo como latin1; se reinterpreta como UTF-8.
function nombreUtf8(nombre: string): string {
  return Buffer.from(nombre, 'latin1').toString('utf8');
}

// Decimal se serializa como string en JSON; el frontend espera números.
function comprobanteAJson(comprobante: any) {
  return { ...comprobante, montoAbonado: Number(comprobante.montoAbonado) };
}

function deudaAJson(deuda: any) {
  return {
    ...deuda,
    montoTotal: Number(deuda.montoTotal),
    saldo: Number(deuda.saldo),
    comprobantes: deuda.comprobantes?.map(comprobanteAJson)
  };
}

function inicioDeHoy(): Date {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

// Rechaza fechas absurdas (p. ej. año 0122 por un error al teclear).
function fechaRazonable(fecha: Date): boolean {
  const anio = fecha.getUTCFullYear();
  return anio >= 2000 && anio <= 2100;
}

// Inicio (UTC) del día de una fecha.
function inicioDelDia(fecha: Date): Date {
  const dia = new Date(fecha);
  dia.setUTCHours(0, 0, 0, 0);
  return dia;
}

/**
 * Crea las deudas que le faltan a uno o varios estudiantes con matrícula activa.
 *
 * Un concepto de pago le corresponde a un estudiante aunque se haya matriculado
 * después de crearse el concepto (p. ej. pensión de octubre y matrícula en
 * diciembre). El límite es el curso: solo cuentan los conceptos cuya fecha
 * máxima no es anterior a la creación del curso del estudiante, para que un
 * curso del año siguiente no herede las pensiones del año anterior.
 * Es idempotente: `skipDuplicates` se apoya en @@unique([estudianteId, conceptoId]).
 */
export async function asignarConceptosFaltantes(
  db: Prisma.TransactionClient,
  where: Prisma.UsuarioWhereInput
): Promise<number> {
  const conceptos = await db.conceptoPago.findMany();
  if (conceptos.length === 0) return 0;

  const estudiantes = await db.usuario.findMany({
    where: { ...where, rol: 'ESTUDIANTE', matricula: { activo: true } },
    select: {
      id: true,
      matricula: { select: { curso: { select: { createdAt: true } } } },
      deudas: { select: { conceptoId: true } }
    }
  });

  const data: Prisma.DeudaCreateManyInput[] = [];
  for (const estudiante of estudiantes) {
    const inicioCurso = inicioDelDia(estudiante.matricula!.curso.createdAt);
    const tiene = new Set(estudiante.deudas.map((d) => d.conceptoId));
    for (const c of conceptos) {
      if (tiene.has(c.id) || c.fechaMaxima < inicioCurso) continue;
      data.push({
        estudianteId: estudiante.id,
        conceptoId: c.id,
        concepto: c.nombre,
        montoTotal: c.monto,
        saldo: c.monto,
        fechaMaxima: c.fechaMaxima
      });
    }
  }
  if (data.length === 0) return 0;
  const creadas = await db.deuda.createMany({ data, skipDuplicates: true });
  return creadas.count;
}

// La mora se registra al consultar: toda deuda pendiente cuya fecha máxima es
// anterior a hoy pasa a MORA. Evita depender de una tarea programada.
function marcarMora(where: Prisma.DeudaWhereInput = {}) {
  return prisma.deuda.updateMany({
    where: { ...where, estado: 'PENDIENTE', fechaMaxima: { lt: inicioDeHoy() } },
    data: { estado: 'MORA' }
  });
}

// Totales de un conjunto de deudas (con sus comprobantes) para las tarjetas.
function resumir(deudas: any[]) {
  let saldoPendiente = new Prisma.Decimal(0);
  let vencido = new Prisma.Decimal(0);
  let pagado = new Prisma.Decimal(0);
  let enRevision = new Prisma.Decimal(0);
  for (const deuda of deudas) {
    saldoPendiente = saldoPendiente.plus(deuda.saldo);
    pagado = pagado.plus(new Prisma.Decimal(deuda.montoTotal).minus(deuda.saldo));
    if (deuda.estado === 'MORA') vencido = vencido.plus(deuda.saldo);
    for (const c of deuda.comprobantes || []) {
      if (c.estado === 'EN_REVISION') enRevision = enRevision.plus(c.montoAbonado);
    }
  }
  return {
    saldoPendiente: Number(saldoPendiente),
    vencido: Number(vencido),
    pagado: Number(pagado),
    enRevision: Number(enRevision)
  };
}

// ---------- ESTUDIANTE ----------

// GET /api/finanzas/estudiante/:id
// Deudas del estudiante con sus comprobantes y los totales de las tarjetas.
// Un estudiante solo puede ver las suyas; el administrador, las de cualquiera.
export const getDeudasEstudiante = async (req: any, res: Response) => {
  const estudianteId = Number(req.params.id);
  if (!Number.isInteger(estudianteId)) {
    return res.status(400).json({ error: 'Identificador de estudiante inválido' });
  }
  if (req.usuario.rol !== 'ADMIN' && Number(req.usuario.id) !== estudianteId) {
    return res.status(403).json({ error: 'No autorizado para esta operación' });
  }

  try {
    await asignarConceptosFaltantes(prisma, { id: estudianteId });
    await marcarMora({ estudianteId });
    const deudas = await prisma.deuda.findMany({
      where: { estudianteId },
      orderBy: { fechaMaxima: 'asc' },
      include: { comprobantes: { orderBy: { fechaSubida: 'desc' } } }
    });
    res.json({ ...resumir(deudas), deudas: deudas.map(deudaAJson) });
  } catch (error) {
    responderError(res, error, 'Error al obtener deudas del estudiante', 'Error al obtener las deudas');
  }
};

// POST /api/finanzas/comprobante  (multipart: `deudaId` + archivo `comprobante`)
// El estudiante sube el comprobante de UN concepto. El archivo va a Cloudflare R2 y
// aquí solo se guarda el enlace. No modifica el saldo: eso ocurre únicamente
// cuando el administrador lo aprueba. El comprobante cubre el saldo completo
// del concepto (no hay abonos parciales).
export const crearComprobante = async (req: any, res: Response) => {
  const idDeuda = Number(req.body.deudaId);
  const archivo = req.file as Express.Multer.File | undefined;
  if (!Number.isInteger(idDeuda)) {
    return res.status(400).json({ error: 'El concepto a pagar es obligatorio' });
  }
  if (!archivo) {
    return res.status(400).json({ error: 'Adjunta la foto o el PDF del comprobante' });
  }

  try {
    const deuda = await prisma.deuda.findUnique({
      where: { id: idDeuda },
      include: { comprobantes: { where: { estado: 'EN_REVISION' }, select: { id: true } } }
    });
    // Deuda ajena se responde igual que inexistente para no revelar ids válidos.
    if (!deuda || deuda.estudianteId !== Number(req.usuario.id)) {
      return res.status(404).json({ error: 'Concepto de pago no encontrado' });
    }
    if (deuda.estado === 'PAGADA' || deuda.saldo.isZero()) {
      return res.status(409).json({ error: 'Este concepto ya está pagado' });
    }
    if (deuda.comprobantes.length > 0) {
      return res.status(409).json({ error: 'Ya enviaste un comprobante para este concepto y está en revisión' });
    }

    const subido = await subirArchivo(
      archivo.buffer, nombreUtf8(archivo.originalname), CARPETA_COMPROBANTES, archivo.mimetype
    );
    try {
      const comprobante = await prisma.comprobante.create({
        data: {
          deudaId: idDeuda,
          montoAbonado: deuda.saldo,
          urlImagen: subido.url,
          publicId: subido.publicId
        }
      });
      res.status(201).json({
        message: 'Comprobante enviado a revisión',
        comprobante: comprobanteAJson(comprobante)
      });
    } catch (error) {
      // Si la base falla, el archivo ya subido quedaría huérfano en el bucket.
      await eliminarArchivo(subido.publicId);
      throw error;
    }
  } catch (error) {
    responderError(res, error, 'Error al registrar comprobante', 'Error al registrar el comprobante');
  }
};

// ---------- ADMINISTRADOR: CONCEPTOS DE PAGO ----------

// GET /api/finanzas/admin/conceptos
export const listarConceptos = async (req: any, res: Response) => {
  try {
    const conceptos = await prisma.conceptoPago.findMany({
      orderBy: { fechaMaxima: 'desc' },
      include: { deudas: { select: { estado: true } } }
    });
    res.json(
      conceptos.map(({ deudas, ...c }) => ({
        ...c,
        monto: Number(c.monto),
        estudiantes: deudas.length,
        pagados: deudas.filter((d) => d.estado === 'PAGADA').length
      }))
    );
  } catch (error) {
    responderError(res, error, 'Error al listar conceptos', 'Error al listar los conceptos de pago');
  }
};

// POST /api/finanzas/admin/conceptos
// Crea el concepto (p. ej. "Pensión Septiembre") y, en la misma transacción, una
// deuda para cada estudiante con matrícula activa, de todos los cursos.
export const crearConcepto = async (req: any, res: Response) => {
  const { nombre, monto, fechaMaxima } = req.body;
  const montoNum = Number(monto);
  const fecha = new Date(fechaMaxima);

  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 150) {
    return res.status(400).json({ error: 'El nombre del concepto es obligatorio (máximo 150 caracteres)' });
  }
  if (!Number.isFinite(montoNum) || montoNum <= 0 || montoNum >= 100000000) {
    return res.status(400).json({ error: 'El monto debe ser mayor que cero' });
  }
  if (!fechaMaxima || isNaN(fecha.getTime())) {
    return res.status(400).json({ error: 'La fecha máxima de pago es obligatoria' });
  }
  if (!fechaRazonable(fecha)) {
    return res.status(400).json({ error: 'La fecha máxima de pago no es válida (revisa el año)' });
  }
  const montoDecimal = new Prisma.Decimal(montoNum).toDecimalPlaces(2);

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const concepto = await tx.conceptoPago.create({
        data: { nombre: nombre.trim(), monto: montoDecimal, fechaMaxima: fecha }
      });
      const estudiantes = await tx.usuario.findMany({
        where: { rol: 'ESTUDIANTE', matricula: { activo: true } },
        select: { id: true }
      });
      const creadas = await tx.deuda.createMany({
        data: estudiantes.map((e) => ({
          estudianteId: e.id,
          conceptoId: concepto.id,
          concepto: concepto.nombre,
          montoTotal: montoDecimal,
          saldo: montoDecimal,
          fechaMaxima: fecha
        }))
      });
      return { concepto, estudiantes: creadas.count };
    });

    res.status(201).json({
      message: `Concepto creado para ${resultado.estudiantes} estudiante(s)`,
      concepto: { ...resultado.concepto, monto: Number(resultado.concepto.monto) },
      estudiantes: resultado.estudiantes
    });
  } catch (error) {
    responderError(res, error, 'Error al crear concepto', 'Error al crear el concepto de pago');
  }
};

// DELETE /api/finanzas/admin/conceptos/:id
// Solo se puede eliminar un concepto sin movimientos (creado por error). Si ya
// tiene comprobantes o pagos, se conserva: es historial financiero.
export const eliminarConcepto = async (req: any, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identificador de concepto inválido' });
  }

  try {
    const movimientos = await prisma.comprobante.count({ where: { deuda: { conceptoId: id } } });
    if (movimientos > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: el concepto ya tiene ${movimientos} pago(s) o comprobante(s) registrados`
      });
    }
    await prisma.$transaction([
      prisma.deuda.deleteMany({ where: { conceptoId: id } }),
      prisma.conceptoPago.delete({ where: { id } })
    ]);
    res.json({ message: 'Concepto eliminado' });
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Concepto no encontrado' });
    // P2003: llegó un comprobante entre la comprobación y el borrado.
    if (error?.code === 'P2003') {
      return res.status(409).json({ error: 'No se puede eliminar: el concepto ya tiene pagos registrados' });
    }
    responderError(res, error, 'Error al eliminar concepto', 'Error al eliminar el concepto de pago');
  }
};

// ---------- ADMINISTRADOR: REVISIÓN DE PAGOS ----------

// GET /api/finanzas/admin/pendientes/count
// Devuelve solo un entero. Lo consulta el dashboard para el globo de
// notificaciones, por eso es un COUNT sobre la columna indexada `estado`.
export const contarComprobantesPendientes = async (req: any, res: Response) => {
  try {
    const total = await prisma.comprobante.count({ where: { estado: 'EN_REVISION' } });
    res.json(total);
  } catch (error) {
    res.status(500).json({ error: 'Error al contar los comprobantes pendientes' });
  }
};

// GET /api/finanzas/admin/comprobantes?estado=EN_REVISION
// Bandeja de revisión: comprobantes con su deuda y el estudiante.
export const listarComprobantes = async (req: any, res: Response) => {
  const estado = String(req.query.estado || 'EN_REVISION');
  if (!['EN_REVISION', 'APROBADO', 'RECHAZADO', 'ANULADO'].includes(estado)) {
    return res.status(400).json({ error: 'Estado de comprobante inválido' });
  }

  try {
    const comprobantes = await prisma.comprobante.findMany({
      where: { estado: estado as 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'ANULADO' },
      orderBy: { fechaSubida: 'asc' },
      include: {
        deuda: {
          select: {
            id: true,
            concepto: true,
            montoTotal: true,
            saldo: true,
            fechaMaxima: true,
            estado: true,
            estudiante: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                cedula: true,
                matricula: { select: { curso: { select: { id: true, ramaArtesanal: true } } } }
              }
            }
          }
        }
      }
    });
    res.json(comprobantes.map((c) => ({ ...comprobanteAJson(c), deuda: deudaAJson(c.deuda) })));
  } catch (error) {
    responderError(res, error, 'Error al listar comprobantes', 'Error al listar los comprobantes');
  }
};

// GET /api/finanzas/admin/cursos/:cursoId/estudiantes
// Estudiantes activos del curso con su resumen financiero, para que el
// administrador elija a quién revisar.
export const listarEstudiantesCurso = async (req: any, res: Response) => {
  const cursoId = Number(req.params.cursoId);
  if (!Number.isInteger(cursoId)) {
    return res.status(400).json({ error: 'Identificador de curso inválido' });
  }

  try {
    await asignarConceptosFaltantes(prisma, { matricula: { cursoId } });
    await marcarMora({ estudiante: { matricula: { cursoId } } });
    const matriculas = await prisma.matricula.findMany({
      where: { cursoId, activo: true },
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
      select: {
        id: true,
        apellidos: true,
        nombres: true,
        cedula: true,
        usuario: {
          select: {
            id: true,
            fotoUrl: true,
            deudas: {
              select: {
                estado: true,
                saldo: true,
                montoTotal: true,
                comprobantes: { select: { estado: true, montoAbonado: true } }
              }
            }
          }
        }
      }
    });

    res.json(
      matriculas.map((m) => ({
        usuarioId: m.usuario.id,
        matriculaId: m.id,
        apellidos: m.apellidos,
        nombres: m.nombres,
        cedula: m.cedula,
        fotoUrl: m.usuario.fotoUrl,
        ...resumir(m.usuario.deudas),
        comprobantesPorRevisar: m.usuario.deudas.reduce(
          (n, d) => n + d.comprobantes.filter((c) => c.estado === 'EN_REVISION').length,
          0
        )
      }))
    );
  } catch (error) {
    responderError(res, error, 'Error al listar estudiantes del curso', 'Error al listar los estudiantes');
  }
};

// PUT /api/finanzas/admin/comprobante/:id/aprobar
// Aprueba el comprobante y descuenta el monto del saldo de la deuda en una sola
// transacción: o se aplican los dos cambios, o ninguno.
export const aprobarComprobante = async (req: any, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identificador de comprobante inválido' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const comprobante = await tx.comprobante.findUnique({ where: { id } });
      if (!comprobante) throw new ErrorNegocio(404, 'Comprobante no encontrado');

      // Las dos escrituras son condicionales y se verifican por `count`: así dos
      // aprobaciones simultáneas no descuentan dos veces ni dejan saldo negativo.
      const aprobado = await tx.comprobante.updateMany({
        where: { id, estado: 'EN_REVISION' },
        data: { estado: 'APROBADO' }
      });
      if (aprobado.count !== 1) throw new ErrorNegocio(409, 'El comprobante ya fue revisado');

      const descontado = await tx.deuda.updateMany({
        where: { id: comprobante.deudaId, saldo: { gte: comprobante.montoAbonado } },
        data: { saldo: { decrement: comprobante.montoAbonado } }
      });
      if (descontado.count !== 1) {
        throw new ErrorNegocio(409, 'El monto del comprobante supera el saldo del concepto');
      }

      let deuda = await tx.deuda.findUniqueOrThrow({ where: { id: comprobante.deudaId } });
      if (deuda.saldo.isZero()) {
        deuda = await tx.deuda.update({ where: { id: deuda.id }, data: { estado: 'PAGADA' } });
      }
      return { comprobante: { ...comprobante, estado: 'APROBADO' }, deuda };
    });

    res.json({
      message: 'Comprobante aprobado',
      comprobante: comprobanteAJson(resultado.comprobante),
      deuda: deudaAJson(resultado.deuda)
    });
  } catch (error) {
    responderError(res, error, 'Error al aprobar comprobante', 'Error al aprobar el comprobante');
  }
};

// PUT /api/finanzas/admin/comprobante/:id/rechazar  { motivo? }
// Rechaza un comprobante en revisión. No toca el saldo: nunca se descontó. El
// estudiante puede volver a subir uno para el mismo concepto.
export const rechazarComprobante = async (req: any, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identificador de comprobante inválido' });
  }
  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim().slice(0, 300) : '';

  try {
    // Condicional sobre el estado: un comprobante ya aprobado no se puede
    // rechazar después, porque su monto ya fue descontado de la deuda.
    const rechazado = await prisma.comprobante.updateMany({
      where: { id, estado: 'EN_REVISION' },
      data: { estado: 'RECHAZADO', motivoRechazo: motivo || null }
    });
    if (rechazado.count !== 1) {
      const existe = await prisma.comprobante.count({ where: { id } });
      return existe
        ? res.status(409).json({ error: 'El comprobante ya fue revisado' })
        : res.status(404).json({ error: 'Comprobante no encontrado' });
    }
    res.json({ message: 'Comprobante rechazado' });
  } catch (error) {
    responderError(res, error, 'Error al rechazar comprobante', 'Error al rechazar el comprobante');
  }
};

const METODOS_MANUALES = ['EFECTIVO', 'TRANSFERENCIA'] as const;
type MetodoManual = (typeof METODOS_MANUALES)[number];
const NOMBRE_METODO: Record<MetodoManual, string> = { EFECTIVO: 'efectivo', TRANSFERENCIA: 'transferencia' };

function metodoManual(valor: unknown): MetodoManual | null {
  return METODOS_MANUALES.includes(valor as MetodoManual) ? (valor as MetodoManual) : null;
}

// PUT /api/finanzas/admin/deuda/:id/pago-manual  { metodo: 'EFECTIVO' | 'TRANSFERENCIA' }
// (también /pago-efectivo, que equivale a metodo EFECTIVO)
// El administrador registra un pago recibido fuera del sistema y el concepto
// queda pagado. Queda un registro aprobado con el método como constancia.
export const registrarPagoManual = async (req: any, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identificador de concepto inválido' });
  }
  const metodo = req.path.endsWith('/pago-efectivo') ? 'EFECTIVO' : metodoManual(req.body?.metodo);
  if (!metodo) {
    return res.status(400).json({ error: 'El método de pago debe ser EFECTIVO o TRANSFERENCIA' });
  }

  try {
    const deuda = await prisma.$transaction(async (tx) => {
      const actual = await tx.deuda.findUnique({ where: { id } });
      if (!actual) throw new ErrorNegocio(404, 'Concepto de pago no encontrado');
      if (actual.saldo.isZero()) throw new ErrorNegocio(409, 'Este concepto ya está pagado');

      // Condicional sobre el saldo leído: si otra operación lo cambió entre
      // medias (p. ej. se aprobó un comprobante), no se registra un pago doble.
      const pagada = await tx.deuda.updateMany({
        where: { id, saldo: actual.saldo },
        data: { saldo: 0, estado: 'PAGADA' }
      });
      if (pagada.count !== 1) throw new ErrorNegocio(409, 'El concepto cambió mientras se registraba el pago; vuelve a intentarlo');

      await tx.comprobante.create({
        data: { deudaId: id, metodo, estado: 'APROBADO', montoAbonado: actual.saldo }
      });
      // Un comprobante que seguía en revisión para este concepto ya no aplica.
      await tx.comprobante.updateMany({
        where: { deudaId: id, estado: 'EN_REVISION' },
        data: { estado: 'RECHAZADO', motivoRechazo: `El pago se registró por ${NOMBRE_METODO[metodo]}` }
      });

      return tx.deuda.findUniqueOrThrow({
        where: { id },
        include: { comprobantes: { orderBy: { fechaSubida: 'desc' } } }
      });
    });

    res.json({ message: `Pago por ${NOMBRE_METODO[metodo]} registrado`, deuda: deudaAJson(deuda) });
  } catch (error) {
    responderError(res, error, 'Error al registrar pago manual', 'Error al registrar el pago');
  }
};

// PUT /api/finanzas/admin/comprobante/:id/metodo  { metodo: 'EFECTIVO' | 'TRANSFERENCIA' }
// Corrige el método de un pago manual ya registrado (p. ej. se marcó efectivo y
// era transferencia). No toca montos ni saldos.
export const cambiarMetodoPago = async (req: any, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identificador de pago inválido' });
  }
  const metodo = metodoManual(req.body?.metodo);
  if (!metodo) {
    return res.status(400).json({ error: 'El método de pago debe ser EFECTIVO o TRANSFERENCIA' });
  }

  try {
    // Solo pagos manuales aprobados: un voucher subido por el estudiante es
    // siempre un COMPROBANTE y conserva su imagen.
    const cambiado = await prisma.comprobante.updateMany({
      where: { id, estado: 'APROBADO', metodo: { in: [...METODOS_MANUALES] } },
      data: { metodo }
    });
    if (cambiado.count !== 1) {
      const existe = await prisma.comprobante.count({ where: { id } });
      return existe
        ? res.status(409).json({ error: 'Solo se puede cambiar el método de un pago manual aprobado' })
        : res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json({ message: `Método cambiado a ${NOMBRE_METODO[metodo]}` });
  } catch (error) {
    responderError(res, error, 'Error al cambiar método de pago', 'Error al cambiar el método de pago');
  }
};

// PUT /api/finanzas/admin/comprobante/:id/anular  { motivo? }
// Restablece un pago ya aprobado (registrado por error): el monto vuelve al
// saldo de la deuda y el pago queda ANULADO, sin borrarse, como historial. La
// deuda vuelve a PENDIENTE, o a MORA si su fecha máxima ya pasó.
export const anularPago = async (req: any, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identificador de pago inválido' });
  }
  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim().slice(0, 300) : '';

  try {
    const deuda = await prisma.$transaction(async (tx) => {
      const pago = await tx.comprobante.findUnique({ where: { id } });
      if (!pago) throw new ErrorNegocio(404, 'Pago no encontrado');

      // Condicional sobre el estado: dos anulaciones simultáneas no devuelven
      // el monto dos veces.
      const anulado = await tx.comprobante.updateMany({
        where: { id, estado: 'APROBADO' },
        data: { estado: 'ANULADO', motivoRechazo: motivo || 'Pago anulado por el administrador' }
      });
      if (anulado.count !== 1) throw new ErrorNegocio(409, 'Solo se puede anular un pago aprobado');

      const actual = await tx.deuda.findUniqueOrThrow({ where: { id: pago.deudaId } });
      const saldo = actual.saldo.plus(pago.montoAbonado);
      if (saldo.greaterThan(actual.montoTotal)) {
        throw new ErrorNegocio(409, 'El saldo resultante superaría el valor del concepto');
      }
      return tx.deuda.update({
        where: { id: actual.id },
        data: { saldo, estado: actual.fechaMaxima < inicioDeHoy() ? 'MORA' : 'PENDIENTE' },
        include: { comprobantes: { orderBy: { fechaSubida: 'desc' } } }
      });
    });

    res.json({ message: 'Pago anulado: el concepto vuelve a estar pendiente', deuda: deudaAJson(deuda) });
  } catch (error) {
    responderError(res, error, 'Error al anular pago', 'Error al anular el pago');
  }
};
