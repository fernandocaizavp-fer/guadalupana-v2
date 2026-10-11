import { Router, Request, Response, NextFunction } from 'express';
import {
  anunciosPublicados, galeriaPublicada, calendarioPublicado, registrarProspecto,
  listarProspectos, contarProspectosPendientes, crearProspecto, cambiarEstadoProspecto, eliminarProspecto,
  listarAnunciosPublicos, crearAnuncioPublico, actualizarAnuncioPublico, eliminarAnuncioPublico,
  listarGaleria, subirFotoGaleria, renombrarFotoGaleria, eliminarFotoGaleria,
  listarCalendario, crearEvento, actualizarEvento, eliminarEvento
} from '../controllers/portal.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';
import { subirImagen } from '../middlewares/upload.middleware';

const router = Router();

// Límite propio del formulario público: 5 solicitudes por visitante cada hora.
// El límite global (defensa.middleware) deja pasar 50 por minuto, demasiado
// para un endpoint que escribe en la base sin autenticación.
const MAX_SOLICITUDES = 5;
const VENTANA_MS = 60 * 60 * 1000;
const solicitudesPorIp = new Map<string, number[]>();

// En Render el servidor está detrás de un proxy, así que `req.ip` es la del
// proxy; la del visitante llega en la cabecera X-Forwarded-For.
function ipDelVisitante(req: Request): string {
  const reenviada = req.headers['x-forwarded-for'];
  const primera = (Array.isArray(reenviada) ? reenviada[0] : reenviada)?.split(',')[0]?.trim();
  return primera || req.ip || 'desconocida';
}

function limitarSolicitudes(req: Request, res: Response, next: NextFunction) {
  const ip = ipDelVisitante(req);
  const ahora = Date.now();
  const recientes = (solicitudesPorIp.get(ip) || []).filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= MAX_SOLICITUDES) {
    return res.status(429).json({ error: 'Ya recibimos varias solicitudes desde tu conexión. Inténtalo más tarde' });
  }
  recientes.push(ahora);
  solicitudesPorIp.set(ip, recientes);
  // Limpieza ocasional para que el mapa no crezca sin límite.
  if (solicitudesPorIp.size > 5000) {
    for (const [clave, tiempos] of solicitudesPorIp) {
      if (tiempos.every((t) => ahora - t >= VENTANA_MS)) solicitudesPorIp.delete(clave);
    }
  }
  next();
}

// ── Públicas: sin token ──
router.get('/anuncios', anunciosPublicados);
router.get('/galeria', galeriaPublicada);
router.get('/calendario', calendarioPublicado);
router.post('/prospectos', limitarSolicitudes, registrarProspecto);

// ── Privadas: todo lo que cuelga de /admin exige token de administrador ──
const admin = Router();
admin.use(verificarToken, soloAdmin);

admin.get('/prospectos', listarProspectos);
admin.get('/prospectos/pendientes/count', contarProspectosPendientes);
admin.post('/prospectos', crearProspecto);
admin.put('/prospectos/:id', cambiarEstadoProspecto);
admin.delete('/prospectos/:id', eliminarProspecto);

admin.get('/anuncios', listarAnunciosPublicos);
admin.post('/anuncios', subirImagen, crearAnuncioPublico);
admin.put('/anuncios/:id', subirImagen, actualizarAnuncioPublico);
admin.delete('/anuncios/:id', eliminarAnuncioPublico);

admin.get('/galeria', listarGaleria);
admin.post('/galeria', subirImagen, subirFotoGaleria);
admin.put('/galeria/:id', renombrarFotoGaleria);
admin.delete('/galeria/:id', eliminarFotoGaleria);

admin.get('/calendario', listarCalendario);
admin.post('/calendario', crearEvento);
admin.put('/calendario/:id', actualizarEvento);
admin.delete('/calendario/:id', eliminarEvento);

router.use('/admin', admin);

export default router;
