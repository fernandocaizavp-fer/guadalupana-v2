import { Router } from 'express';
import {
  obtenerConfiguracion,
  actualizarConfiguracion,
  habilitarSupletorioIndividual,
  revocarSupletorioIndividual,
  listarPermisosSupletorio,
  habilitarRecalificacionExamen,
  revocarRecalificacionExamen,
  listarPermisosExamenGrado
} from '../controllers/configuracion.controller';
import {
  obtenerNotasBulk,
  guardarNotasBulk,
  obtenerExamenesBulk,
  guardarExamenesBulk,
  obtenerAsistenciasBulk,
  guardarAsistenciasBulk,
  limpiarNotasBulk,
  limpiarExamenesBulk,
  limpiarAsistenciasBulk
} from '../controllers/ingreso-rapido.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verificarToken, obtenerConfiguracion);
router.put('/', verificarToken, soloAdmin, actualizarConfiguracion);
router.get('/permisos-supletorio', verificarToken, soloAdmin, listarPermisosSupletorio);
router.post('/permiso-supletorio', verificarToken, soloAdmin, habilitarSupletorioIndividual);
router.delete('/permiso-supletorio/:matriculaId', verificarToken, soloAdmin, revocarSupletorioIndividual);
router.get('/permisos-examen-grado', verificarToken, soloAdmin, listarPermisosExamenGrado);
router.post('/permiso-examen-grado', verificarToken, soloAdmin, habilitarRecalificacionExamen);
router.delete('/permiso-examen-grado/:matriculaId', verificarToken, soloAdmin, revocarRecalificacionExamen);

// Ingreso rápido masivo de notas finales para los formatos AL (solo ADMIN)
router.get('/notas-bulk/:cursoId', verificarToken, soloAdmin, obtenerNotasBulk);
router.post('/notas-bulk', verificarToken, soloAdmin, guardarNotasBulk);
router.get('/examenes-bulk/:cursoId', verificarToken, soloAdmin, obtenerExamenesBulk);
router.post('/examenes-bulk', verificarToken, soloAdmin, guardarExamenesBulk);
router.get('/asistencias-bulk/:cursoId', verificarToken, soloAdmin, obtenerAsistenciasBulk);
router.post('/asistencias-bulk', verificarToken, soloAdmin, guardarAsistenciasBulk);
router.delete('/notas-bulk/:cursoId', verificarToken, soloAdmin, limpiarNotasBulk);
router.delete('/examenes-bulk/:cursoId', verificarToken, soloAdmin, limpiarExamenesBulk);
router.delete('/asistencias-bulk/:cursoId', verificarToken, soloAdmin, limpiarAsistenciasBulk);

export default router;
