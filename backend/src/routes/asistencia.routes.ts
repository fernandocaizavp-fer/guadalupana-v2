import { Router } from 'express';
import {
  crearAsistencia, getAsistenciasPorMateria, getResumenAsistenciaCurso,
  guardarObservacion, actualizarAsistencia, eliminarAsistencia, generarAL18
} from '../controllers/asistencia.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', verificarToken, soloRoles('ADMIN', 'PROFESOR'), crearAsistencia);
router.get('/materia/:materiaId', verificarToken, getAsistenciasPorMateria);
router.get('/resumen/:cursoId', verificarToken, getResumenAsistenciaCurso);
router.post('/observacion', verificarToken, soloRoles('ADMIN', 'PROFESOR'), guardarObservacion);
router.put('/:id', verificarToken, soloRoles('ADMIN', 'PROFESOR'), actualizarAsistencia);
router.delete('/:id', verificarToken, soloRoles('ADMIN', 'PROFESOR'), eliminarAsistencia);
router.get('/al18/:cursoId', verificarToken, generarAL18);

export default router;