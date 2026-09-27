import prisma from './prisma';

/**
 * Devuelve la configuración global (fila única id = 1). Si no existe todavía,
 * la crea con los valores por defecto del esquema. Así el resto del sistema
 * siempre obtiene una configuración válida sin depender de un seed previo.
 */
export async function getConfiguracion() {
  return prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 }
  });
}

type RangoNota = { notaMinima: number; notaMaxima: number };

/** True si el valor está dentro del rango configurado [notaMinima, notaMaxima]. */
export function notaEnRango(valor: number, config: RangoNota): boolean {
  return valor >= config.notaMinima && valor <= config.notaMaxima;
}

/**
 * Verifica que todos los valores no nulos de una lista estén dentro del rango.
 * Devuelve el primer valor inválido encontrado, o null si todos son válidos.
 */
export function primeraNotaFueraDeRango(
  valores: Array<number | null | undefined>,
  config: RangoNota
): number | null {
  for (const v of valores) {
    if (v === null || v === undefined) continue;
    if (!notaEnRango(v, config)) return v;
  }
  return null;
}

// Ecuador no tiene horario de verano: zona fija UTC-5.
const ECUADOR_OFFSET_MS = 5 * 60 * 60 * 1000;

// Día calendario (YYYY-MM-DD) de hoy en hora de Ecuador.
function hoyEcuador(): string {
  return new Date(Date.now() - ECUADOR_OFFSET_MS).toISOString().substring(0, 10);
}

// Día calendario (YYYY-MM-DD) de una fecha guardada. Las fechas de la
// configuración se guardan como medianoche UTC del día elegido, así que su
// porción de día es directa (sin desplazar por zona horaria).
function diaGuardado(d: Date | string): string {
  return new Date(d).toISOString().substring(0, 10);
}

/**
 * True si hoy (Ecuador) es igual o anterior al día `hasta` (INCLUSIVO):
 * "hasta el 3" cubre todo el día 3. La comparación es por día calendario,
 * no por hora, para evitar cortes por zona horaria.
 */
export function vigenteHasta(hasta: Date | null | undefined): boolean {
  if (!hasta) return false;
  return hoyEcuador() <= diaGuardado(hasta);
}

/**
 * Indica si una ventana [inicio, fin] está abierta hoy, controlada SOLO por las
 * fechas (comparación por día calendario, ambos extremos inclusivos). Sin
 * período definido (ambas fechas en null) se considera cerrada.
 */
export function ventanaAbierta(inicio: Date | null, fin: Date | null): boolean {
  if (!inicio && !fin) return false;
  const hoy = hoyEcuador();
  if (inicio && hoy < diaGuardado(inicio)) return false;
  if (fin && hoy > diaGuardado(fin)) return false;
  return true;
}

/** Ventana general de supletorios. */
export function ventanaSupletorioAbierta(config: {
  supletorioInicio: Date | null;
  supletorioFin: Date | null;
}): boolean {
  return ventanaAbierta(config.supletorioInicio, config.supletorioFin);
}

/** Ventana general de exámenes de grado. */
export function ventanaExamenGradoAbierta(config: {
  examenGradoInicio: Date | null;
  examenGradoFin: Date | null;
}): boolean {
  return ventanaAbierta(config.examenGradoInicio, config.examenGradoFin);
}
