import { Request, Response, NextFunction } from 'express';

// Manejador global de errores de Express. Sin él, un JSON mal formado o un error
// no capturado devuelve una página HTML con la traza (que además revela rutas
// internas del servidor). Aquí siempre se responde JSON y la traza solo va al log.
export const manejadorErrores = (err: any, req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La petición es demasiado grande' });
  }

  console.error(`Error no controlado en ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({ error: 'Error interno del servidor' });
};
