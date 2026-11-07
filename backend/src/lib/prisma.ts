import { PrismaClient } from '@prisma/client';
import { extensionAuditoria } from './auditoria';

// Cliente base: solo lo usa la auditoría para leer el estado previo y escribir
// su propio registro sin auditarse a sí misma.
const base = new PrismaClient();

// Cliente que usa toda la aplicación: idéntico al base, pero cada escritura
// sobre una tabla sensible queda registrada en Auditoria (ver lib/auditoria.ts).
const prisma = base.$extends(extensionAuditoria(base));

export default prisma;

// Cliente o transacción (tx de $transaction) del cliente extendido. Usar este tipo
// en lugar de Prisma.TransactionClient, que describe el cliente sin la extensión.
export type ClienteDb = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;
