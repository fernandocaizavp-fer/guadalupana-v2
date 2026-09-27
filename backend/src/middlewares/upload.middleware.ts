import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Límite de negocio: 10 MB por archivo.
export const LIMITE_BYTES = 10 * 1024 * 1024;
// Tope duro de seguridad en multer (evita llenar memoria con archivos enormes).
const TOPE_MULTER = 50 * 1024 * 1024;

// Almacenamiento en memoria: el archivo se sube luego a Cloudinary, no a disco.
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
