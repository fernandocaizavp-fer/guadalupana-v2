import { AsyncLocalStorage } from 'async_hooks';
import { Prisma, PrismaClient } from '@prisma/client';

// ── Auditoría silenciosa ──
// Cada escritura sobre una tabla sensible (notas, finanzas, matrículas,
// usuarios) deja una fila en Auditoria con quién, cuándo, desde qué IP, el
// valor anterior y el nuevo. Se implementa como extensión del cliente Prisma,
// así ningún controlador tiene que acordarse de registrar nada.

export interface ContextoAuditoria {
  usuarioId: number | null;
  rol: string | null;
  ip: string | null;
}

// verificarToken abre este contexto con el usuario del JWT; todo lo que ocurre
// después en esa petición (incluidos los await) lo ve.
export const contextoAuditoria = new AsyncLocalStorage<ContextoAuditoria>();

const MODELOS_AUDITADOS = new Set<string>([
  'NotaTarea', 'Supletorio', 'NotaDisciplina', 'ExamenGrado',
  'RegistroNotaGlobal', 'RegistroExamenGlobal', 'RegistroAsistenciaGlobal',
  'ConceptoPago', 'Deuda', 'Comprobante',
  'Matricula', 'Usuario', 'Curso', 'Materia'
]);

const OPERACIONES_ESCRITURA = new Set<string>([
  'create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'
]);

// Nunca se copian al historial.
const CAMPOS_OCULTOS = new Set(['password', 'codigo']);

// Para updateMany/deleteMany se guarda como mucho este número de filas previas.
const MAX_FILAS_ANTES = 200;

const delegado = (cliente: PrismaClient, modelo: string) =>
  (cliente as any)[modelo.charAt(0).toLowerCase() + modelo.slice(1)];

// Convierte a JSON plano (Decimal y Date pasan a texto) y quita campos sensibles.
function limpiar(valor: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (valor === null || valor === undefined) return Prisma.DbNull;
  return JSON.parse(
    JSON.stringify(valor, (clave, v) => (CAMPOS_OCULTOS.has(clave) ? '[oculto]' : v))
  );
}

async function leerAntes(cliente: PrismaClient, modelo: string, operacion: string, args: any) {
  const d = delegado(cliente, modelo);
  if (['update', 'upsert', 'delete'].includes(operacion)) {
    return d.findUnique({ where: args.where });
  }
  if (['updateMany', 'deleteMany'].includes(operacion)) {
    return d.findMany({ where: args.where, take: MAX_FILAS_ANTES });
  }
  return null;
}

function idDe(resultado: any, args: any): string | null {
  const id = resultado?.id ?? args?.where?.id;
  if (id !== undefined && id !== null) return String(id);
  // Claves compuestas (p. ej. matriculaId_materiaId): se guarda el where tal cual.
  return args?.where ? JSON.stringify(args.where).slice(0, 100) : null;
}

export function extensionAuditoria(base: PrismaClient) {
  return Prisma.defineExtension({
    name: 'auditoria',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!MODELOS_AUDITADOS.has(model) || !OPERACIONES_ESCRITURA.has(operation)) {
            return query(args);
          }

          // La lectura previa y el registro usan el cliente base (sin la
          // extensión): no se auditan a sí mismos. Si fallan, la operación
          // principal sigue: la auditoría nunca debe tumbar una escritura real.
          const antes = await leerAntes(base, model, operation, args).catch(() => null);
          const resultado: any = await query(args);

          const despues = operation.endsWith('Many')
            ? { filas: resultado?.count ?? null, data: (args as any)?.data ?? null }
            : operation === 'delete' ? null : resultado;

          const ctx = contextoAuditoria.getStore();
          base.auditoria
            .create({
              data: {
                usuarioId: ctx?.usuarioId ?? null,
                rol: ctx?.rol ?? null,
                ip: ctx?.ip ?? null,
                accion: operation.toUpperCase(),
                entidad: model,
                entidadId: idDe(resultado, args),
                antes: limpiar(antes),
                despues: limpiar(despues)
              }
            })
            .catch((e) => console.error('No se pudo registrar la auditoría:', e?.message || e));

          return resultado;
        }
      }
    }
  });
}
