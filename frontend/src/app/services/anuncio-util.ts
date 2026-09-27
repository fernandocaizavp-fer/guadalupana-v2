/**
 * Devuelve la etiqueta de autor para un anuncio según su rol.
 * - ADMIN    → "Administración"
 * - PROFESOR → "Docente <nombre>"
 * - null/otro (anuncios viejos sin autor) → "" (no se muestra etiqueta)
 */
export function etiquetaAutorAnuncio(anuncio: any): string {
  if (!anuncio) return '';
  switch (anuncio.autorRol) {
    case 'ADMIN':
      return 'Administración';
    case 'PROFESOR':
      return anuncio.autorNombre ? `Docente ${anuncio.autorNombre}` : 'Docente';
    default:
      return '';
  }
}
