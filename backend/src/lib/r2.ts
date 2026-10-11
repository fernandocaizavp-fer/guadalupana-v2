import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { eliminarArchivo as eliminarDeCloudinary } from './cloudinary';

// Almacenamiento de archivos en Cloudflare R2 (API compatible con S3).
// Credenciales SOLO desde variables de entorno (nunca quemadas):
//   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME, R2_PUBLIC_URL

// Valor que se guarda en la columna `resourceType` de los archivos subidos a
// R2. Los archivos anteriores a la migración conservan el tipo de Cloudinary
// ('image' | 'raw' | 'video'), y así se sabe de dónde borrar cada uno.
export const ORIGEN_R2 = 'r2';

export interface ArchivoSubido {
  url: string;
  // Clave del objeto dentro del bucket (se guarda en la columna `publicId`).
  publicId: string;
  resourceType: string;
}

let cliente: S3Client | null = null;

function variable(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (almacenamiento R2)`);
  return valor;
}

// El cliente se crea en el primer uso y no al importar el módulo: si falta una
// variable, falla la subida con un mensaje claro en vez de impedir el arranque
// del servidor.
function getCliente(): S3Client {
  if (!cliente) {
    cliente = new S3Client({
      region: 'auto', // R2 no usa regiones; el SDK exige un valor
      endpoint: variable('R2_ENDPOINT'),
      credentials: {
        accessKeyId: variable('R2_ACCESS_KEY_ID'),
        secretAccessKey: variable('R2_SECRET_ACCESS_KEY')
      }
    });
  }
  return cliente;
}

function urlPublicaBase(): string {
  return variable('R2_PUBLIC_URL').replace(/\/+$/, '');
}

// Deja el nombre apto para una URL: sin tildes, espacios ni símbolos. El nombre
// original (con tildes) se sigue guardando aparte en la base para mostrarlo.
function nombreSeguro(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._]+/, '')
    .slice(-100);
  return limpio || 'archivo';
}

/**
 * Sube un archivo (buffer en memoria) a R2 y devuelve su URL pública.
 * La clave lleva un UUID delante del nombre, así dos archivos con el mismo
 * nombre no se pisan y la URL no se puede adivinar.
 */
export async function subirArchivo(
  buffer: Buffer,
  nombreOriginal: string,
  carpeta = 'cf_guadalupana',
  tipo?: string
): Promise<ArchivoSubido> {
  const clave = `${carpeta}/${randomUUID()}-${nombreSeguro(nombreOriginal)}`;

  await getCliente().send(
    new PutObjectCommand({
      Bucket: variable('R2_BUCKET_NAME'),
      Key: clave,
      Body: buffer,
      // Con el tipo correcto el navegador muestra imágenes y PDF en vez de descargarlos.
      ContentType: tipo || 'application/octet-stream',
      // Al descargar se conserva el nombre original, incluidas las tildes.
      ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(nombreOriginal)}`
    })
  );

  return {
    url: `${urlPublicaBase()}/${clave.split('/').map(encodeURIComponent).join('/')}`,
    publicId: clave,
    resourceType: ORIGEN_R2
  };
}

/**
 * Elimina un archivo. Acepta la clave del objeto o su URL pública completa.
 * No lanza si falla: un archivo huérfano no debe impedir borrar el registro.
 *
 * `origen` es el `resourceType` guardado junto al archivo: si es un tipo de
 * Cloudinary, el archivo es anterior a la migración y se borra de allí.
 */
export async function eliminarArchivo(claveOUrl: string, origen: string = ORIGEN_R2): Promise<void> {
  if (origen !== ORIGEN_R2) {
    return eliminarDeCloudinary(claveOUrl, origen);
  }

  try {
    let clave = claveOUrl;
    if (/^https?:\/\//i.test(claveOUrl)) {
      const base = `${urlPublicaBase()}/`;
      // Una URL que no es de este bucket no se toca.
      if (!claveOUrl.startsWith(base)) return;
      clave = claveOUrl.slice(base.length).split('/').map(decodeURIComponent).join('/');
    }
    await getCliente().send(new DeleteObjectCommand({ Bucket: variable('R2_BUCKET_NAME'), Key: clave }));
  } catch (error) {
    console.error('[r2] No se pudo eliminar', claveOUrl, error);
  }
}
