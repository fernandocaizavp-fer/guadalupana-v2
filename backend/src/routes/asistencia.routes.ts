import { Router } from 'express';
import {
  crearAsistencia, getAsistenciasPorMateria, getResumenAsistenciaCurso,
  guardarObservacion, actualizarAsistencia, eliminarAsistencia, generarAL18
} from '../controllers/asistencia.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';
import {
  soloDocenteDeMateria, soloDocenteDelCurso, materiaDeNuevaAsistencia, materiaDeAsistencia
} from '../middlewares/permisos.middleware';

const router = Router();
const docente = soloRoles('ADMIN', 'PROFESOR');

router.post('/', verificarToken, docente, soloDocenteDeMateria(materiaDeNuevaAsistencia), crearAsistencia);
router.get('/materia/:materiaId', verificarToken, docente, getAsistenciasPorMateria);
router.get('/resumen/:cursoId', verificarToken, docente, getResumenAsistenciaCurso);
router.post('/observacion', verificarToken, docente, soloDocenteDelCurso, guardarObservacion);
router.put('/:id', verificarToken, docente, soloDocenteDeMateria(materiaDeAsistencia), actualizarAsistencia);
router.delete('/:id', verificarToken, docente, soloDocenteDeMateria(materiaDeAsistencia), eliminarAsistencia);
router.get('/al18/:cursoId', verificarToken, docente, generarAL18);

export default router;
