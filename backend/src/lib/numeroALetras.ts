// Conversión de notas numéricas a letras (formato con "coma" para los decimales).
// Ejemplos:  8.50 -> "Ocho coma cincuenta",  9 -> "Nueve",  10 -> "Diez".
// El parámetro `mayuscula` controla la capitalización:
//   - false (por defecto): solo la primera letra en mayúscula (tipo oración) -> notas de materias.
//   - true: todo en mayúsculas -> disciplina y promedio general.

const UNIDADES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'
];

const ESPECIALES: { [n: number]: string } = {
  10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
  16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
  20: 'veinte', 21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro',
  25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve'
};

const DECENAS = [
  '', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'
];

// Convierte un entero de 0 a 100 a letras.
const enteroALetras = (n: number): string => {
  if (n < 10) return UNIDADES[n];
  if (ESPECIALES[n]) return ESPECIALES[n];
  if (n === 100) return 'cien';
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
  }
  return String(n);
};

export const notaALetras = (valor: number | null | undefined, mayuscula = false): string => {
  if (valor === null || valor === undefined) return '';

  let entero = Math.floor(valor);
  let decimales = Math.round((valor - entero) * 100);
  // Corrige el desborde por redondeo (p. ej. 9.999 -> entero 9, decimales 100).
  if (decimales === 100) {
    entero += 1;
    decimales = 0;
  }

  let texto: string;
  if (decimales === 0) {
    texto = enteroALetras(entero);
  } else {
    texto = `${enteroALetras(entero)} coma ${enteroALetras(decimales)}`;
  }

  if (mayuscula) return texto.toUpperCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
