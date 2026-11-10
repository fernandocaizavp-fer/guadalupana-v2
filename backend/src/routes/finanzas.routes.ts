import { Router, Request, Response } from 'express';
import {
  getDeudasEstudiante,
  crearComprobante,
  listarConceptos,
  crearConcepto,
  eliminarConcepto,
  contarComprobantesPendientes,
  listarComprobantes,
  listarEstudiantesCurso,
  aprobarComprobante,
  rechazarComprobante,
  registrarPagoManual,
  cambiarMetodoPago,
  anularPago
} from '../controllers/finanzas.controller';
import { verificarToken, soloAdmin, soloRoles } from '../middlewares/auth.middleware';
import { subirComprobante } from '../middlewares/upload.middleware';

const router = Router();

// FINANZAS DEL ESTUDIANTE DESACTIVADAS (pedido del propietario, 2026-11-10): el
// módulo se rediseñará (periodo lectivo de 12 meses, rangos de pago...). Mientras
// tanto el estudiante no puede ver deudas ni subir comprobantes; el ADMIN sigue
// usando /estudiante/:id desde la pantalla Finanzas. Para reactivar:
//   GET  → soloRoles('ADMIN', 'ESTUDIANTE')   (el controlador ya limita a lo propio)
//   POST → soloRoles('ESTUDIANTE'), subirComprobante, crearComprobante
const finanzasEstudianteDesactivadas = (_req: Request, res: Response) =>
  res.status(403).json({ error: 'El módulo de pagos todavía no está disponible para estudiantes.' });

router.get('/estudiante/:id', verificarToken, soloAdmin, getDeudasEstudiante);
router.post('/comprobante', verificarToken, finanzasEstudianteDesactivadas);

// Administrador: el dinero lo maneja solo el ADMIN (el profesor no interviene).
router.get('/admin/conceptos', verificarToken, soloAdmin, listarConceptos);
router.post('/admin/conceptos', verificarToken, soloAdmin, crearConcepto);
router.delete('/admin/conceptos/:id', verificarToken, soloAdmin, eliminarConcepto);
router.get('/admin/pendientes/count', verificarToken, soloAdmin, contarComprobantesPendientes);
router.get('/admin/comprobantes', verificarToken, soloAdmin, listarComprobantes);
router.get('/admin/cursos/:cursoId/estudiantes', verificarToken, soloAdmin, listarEstudiantesCurso);
router.put('/admin/comprobante/:id/aprobar', verificarToken, soloAdmin, aprobarComprobante);
router.put('/admin/comprobante/:id/rechazar', verificarToken, soloAdmin, rechazarComprobante);
router.put('/admin/deuda/:id/pago-manual', verificarToken, soloAdmin, registrarPagoManual);
// Ruta anterior (solo efectivo): se conserva para clientes que aún no se actualizaron.
router.put('/admin/deuda/:id/pago-efectivo', verificarToken, soloAdmin, registrarPagoManual);
router.put('/admin/comprobante/:id/metodo', verificarToken, soloAdmin, cambiarMetodoPago);
router.put('/admin/comprobante/:id/anular', verificarToken, soloAdmin, anularPago);

export default router;
