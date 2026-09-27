// Utilidades para derivar partes del nombre del curso (curso.ramaArtesanal),
// que se registra con el formato "<Rama> paralelo <Letra>"
// (ej. "Maquillaje paralelo B"). En los documentos oficiales la Rama Artesanal
// debe mostrar SOLO la primera palabra ("Maquillaje"), y el paralelo es la
// tercera palabra ("B").

export const primeraPalabra = (texto: string | null | undefined): string =>
  (texto || '').trim().split(/\s+/)[0] || '';

export const terceraPalabra = (texto: string | null | undefined): string =>
  (texto || '').trim().split(/\s+/)[2] || '';
