import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Límite de negocio: 10 MB por archivo.
export const LIMITE_BYTES = 10 * 1024 * 1024;
// Tope duro de seguridad en multer (evita llenar memoria con archivos enormes).
const TOPE_MULTER = 50 * 1024 * 1024;

// Almacenamiento en memoria: el archivo se sube luego a Cloudflare R2, no a disco.
// Sin fileFilter → se permite cualquier tipo de archivo. Subida múltiple.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TOPE_MULTER }
});

export const subirArchivos = upload.array('archivos');

/**
 * Valida la regla de 10 MB por archivo y devuelve un mensaje claro con el
 * nombre del archivo que se pasa. Llamar después de `subirArchivos`.
 * Devuelve true si todo está bien; si no, responde el error y devuelve false.
 */
export function validarTamano(req: Request, res: Response): boolean {
  const archivos = (req.files as Express.Multer.File[]) || [];
  for (const archivo of archivos) {
    if (archivo.size > LIMITE_BYTES) {
      res.status(400).json({
        error: `El archivo ${archivo.originalname} supera el tamaño máximo de 10 MB`
      });
      return false;
    }
  }
  return true;
}

// Manejo del error de multer cuando se supera el tope duro de seguridad.
export function manejarErrorMulter(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Un archivo supera el tamaño máximo permitido' });
    }
    return res.status(400).json({ error: 'Error al subir el archivo' });
  }
  next(err);
}

// ---------- Subida de UN archivo con tipo restringido (fotos y comprobantes) ----------

const LIMITE_IMAGEN_BYTES = 5 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];

class TipoNoPermitido extends Error {}

// A diferencia de `subirArchivos` (cualquier tipo, para tareas), aquí se limita
// el tipo y el tamaño: son archivos que otra persona va a abrir (el
// administrador revisa comprobantes, todos ven las fotos de perfil). Los
// errores de multer se responden aquí mismo con un mensaje claro.
function unArchivo(campo: string, tipos: string[], descripcion: string) {
  const subir = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: LIMITE_IMAGEN_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
      if (tipos.includes(file.mimetype)) cb(null, true);
      else cb(new TipoNoPermitido());
    }
  }).single(campo);

  return (req: Request, res: Response, next: NextFunction) => {
    subir(req, res, (err: any) => {
      if (!err) return next();
      if (err instanceof TipoNoPermitido) {
        return res.status(400).json({ error: `Tipo de archivo no permitido. Se acepta: ${descripcion}` });
      }
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo supera el tamaño máximo de 5 MB' });
      }
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Error al subir el archivo' });
      }
      next(err);
    });
  };
}

// Campo `foto`: foto de perfil de docentes y estudiantes.
export const subirFoto = unArchivo('foto', TIPOS_IMAGEN, 'imagen JPG, PNG o WEBP');
// Campo `comprobante`: voucher de pago (foto o PDF).
export const subirComprobante = unArchivo(
  'comprobante',
  [...TIPOS_IMAGEN, 'application/pdf'],
  'imagen JPG, PNG, WEBP o PDF'
);
// Campo `imagen`: imágenes del portal público (anuncios a terceros y galería).
export const subirImagen = unArchivo('imagen', TIPOS_IMAGEN, 'imagen JPG, PNG o WEBP');
