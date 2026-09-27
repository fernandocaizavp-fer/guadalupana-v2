import { Router } from 'express';
import {
  crearTarea, getTareasPorMateria, guardarNotasTarea,
  getNotasCursoSemestre, actualizarTarea, eliminarTarea
} from '../controllers/tarea.controller';
import {
  subirArchivosTarea, eliminarArchivoTarea,
  subirEntrega, getMiEntrega, eliminarArchivoEntrega, getEntregasTarea
} from '../controllers/archivo.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';
import { subirArchivos } from '../middlewares/upload.middleware';

const router = Router();

router.post('/', verificarToken, soloRoles('ADMIN', 'PROFESOR'), crearTarea);
router.get('/materia/:materiaId', verificarToken, getTareasPorMateria);
router.post('/notas', verificarToken, soloRoles('ADMIN', 'PROFESOR'), guardarNotasTarea);
router.get('/curso/:cursoId', verificarToken, getNotasCursoSemestre);
router.put('/:id', verificarToken, soloRoles('ADMIN', 'PROFESOR'), actualizarTarea);
router.delete('/:id', verificarToken, soloRoles('ADMIN', 'PROFESOR'), eliminarTarea);

// Archivos adjuntos por el docente
router.post('/:tareaId/archivos', verificarToken, soloRoles('ADMIN', 'PROFESOR'), subirArchivos, subirArchivosTarea);
router.delete('/archivos/:id', verificarToken, soloRoles('ADMIN', 'PROFESOR'), eliminarArchivoTarea);

// Entregas del estudiante
router.post('/:tareaId/entregas', verificarToken, subirArchivos, subirEntrega);
router.get('/:tareaId/entregas/mias', verificarToken, getMiEntrega);
router.delete('/entregas/archivos/:id', verificarToken, eliminarArchivoEntrega);
// El docente ve todas las entregas de una tarea
router.get('/:tareaId/entregas', verificarToken, soloRoles('ADMIN', 'PROFESOR'), getEntregasTarea);

export default router;