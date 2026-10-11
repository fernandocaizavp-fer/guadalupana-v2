import { Router } from 'express';
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
  registrarPagoEfectivo
} from '../controllers/finanzas.controller';
import { verificarToken, soloAdmin, soloRoles } from '../middlewares/auth.middleware';
import { subirComprobante } from '../middlewares/upload.middleware';

const router = Router();

// Estudiante. El controlador verifica además que solo acceda a lo suyo.
router.get('/estudiante/:id', verificarToken, soloRoles('ADMIN', 'ESTUDIANTE'), getDeudasEstudiante);
router.post('/comprobante', verificarToken, soloRoles('ESTUDIANTE'), subirComprobante, crearComprobante);

// Administrador: el dinero lo maneja solo el ADMIN (el profesor no interviene).
router.get('/admin/conceptos', verificarToken, soloAdmin, listarConceptos);
router.post('/admin/conceptos', verificarToken, soloAdmin, crearConcepto);
router.delete('/admin/conceptos/:id', verificarToken, soloAdmin, eliminarConcepto);
router.get('/admin/pendientes/count', verificarToken, soloAdmin, contarComprobantesPendientes);
router.get('/admin/comprobantes', verificarToken, soloAdmin, listarComprobantes);
router.get('/admin/cursos/:cursoId/estudiantes', verificarToken, soloAdmin, listarEstudiantesCurso);
router.put('/admin/comprobante/:id/aprobar', verificarToken, soloAdmin, aprobarComprobante);
router.put('/admin/comprobante/:id/rechazar', verificarToken, soloAdmin, rechazarComprobante);
router.put('/admin/deuda/:id/pago-efectivo', verificarToken, soloAdmin, registrarPagoEfectivo);

export default router;
