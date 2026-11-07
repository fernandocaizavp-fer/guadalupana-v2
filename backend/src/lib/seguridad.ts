import { CorsOptions } from 'cors';

// Secreto de los JWT en un solo lugar. El respaldo 'secreto' se conserva SOLO
// para no tumbar producción si falta la variable en Render (ver CLAUDE.md):
// cuando se confirme que JWT_SECRET existe allí, cambiar este respaldo por un
// error al arrancar. Es una función (no una constante) porque index.ts carga
// el .env después de importar los módulos.
export const jwtSecret = () => process.env.JWT_SECRET || 'secreto';

// Se llama una vez al arrancar, ya con el .env cargado.
export function avisosDeSeguridad() {
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET no está definido: se usa un secreto por defecto inseguro.');
  }
}

// Orígenes permitidos por CORS, separados por comas en CORS_ORIGINS
// (p. ej. "https://guadalupana.vercel.app,https://www.midominio.com").
// Sin la variable se mantiene el comportamiento anterior (cualquier origen)
// para no romper el frontend desplegado; se avisa en el log.
export function opcionesCors(): CorsOptions {
  const lista = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (lista.length === 0) {
    console.warn('⚠️  CORS_ORIGINS no está definido: se acepta cualquier origen.');
    return { origin: '*' };
  }

  const permitidos = new Set([...lista, 'http://localhost:4200']);
  return {
    origin: (origen, callback) => {
      // Sin cabecera Origin: herramientas como curl, Postman o JMeter.
      if (!origen || permitidos.has(origen)) return callback(null, true);
      callback(null, false);
    }
  };
}
