// Documento de identidad del estudiante: cédula ecuatoriana (10 dígitos) o
// pasaporte extranjero (p. ej. el colombiano "FB603825"). Se guarda siempre
// normalizado porque además es la contraseña inicial del estudiante: si se
// guardara "fb603825 " tal cual se escribió, el estudiante tendría que adivinar
// las minúsculas y el espacio final para poder entrar. También evita duplicados
// encubiertos ("FB603825" y "fb603825" serían dos filas distintas para @unique).
//
// Funciones puras (sin Prisma) para poder probarlas sin base de datos.

/** Quita todos los espacios y pasa a mayúsculas. " fb 603825 " → "FB603825". */
export function normalizarDocumento(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, '').toUpperCase();
}

/** null si el documento (ya normalizado) es válido; si no, el motivo. */
export function errorDeDocumento(documento: string): string | null {
  if (!documento) return 'La cédula o pasaporte es obligatoria';
  if (documento.length > 10) return 'La cédula o pasaporte admite máximo 10 caracteres';
  if (!/^[A-Z0-9]+$/.test(documento)) {
    return 'La cédula o pasaporte solo admite letras y números (sin guiones ni símbolos)';
  }
  return null;
}
