import { v2 as cloudinary } from 'cloudinary';

// Credenciales SOLO desde variables de entorno (nunca quemadas).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export interface ArchivoSubido {
  url: string;
  publicId: string;
  resourceType: string;
}

/**
 * Sube un archivo (buffer en memoria) a Cloudinary. `resource_type: 'auto'`
 * permite cualquier tipo (imágenes, PDF, docx, zip, etc.).
 * Devuelve la URL segura y el public_id para poder eliminarlo después.
 */
export function subirArchivo(
  buffer: Buffer,
  nombreOriginal: string,
  carpeta = 'cf_guadalupana'
): Promise<ArchivoSubido> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: carpeta,
        use_filename: true,
        unique_filename: true,
        // Conserva el nombre original para mostrarlo/descargarlo
        public_id: undefined
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Sin respuesta de Cloudinary'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type
        });
      }
    );
    stream.end(buffer);
  });
}

/** Elimina un archivo de Cloudinary por su public_id. No lanza si falla. */
export async function eliminarArchivo(publicId: string, resourceType = 'image'): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('[cloudinary] No se pudo eliminar', publicId, error);
  }
}

export default cloudinary;
