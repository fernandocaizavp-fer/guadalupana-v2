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
import {
  soloDocenteDeMateria, materiaDelCuerpo, materiaDeTarea, materiaDeArchivoTarea, materiasDeNotasTarea
} from '../middlewares/permisos.middleware';

const router = Router();
const docente = soloRoles('ADMIN', 'PROFESOR');

router.post('/', verificarToken, docente, soloDocenteDeMateria(materiaDelCuerpo), crearTarea);
// Abierta al estudiante: el controlador le devuelve solo sus propias notas.
router.get('/materia/:materiaId', verificarToken, getTareasPorMateria);
router.post('/notas', verificarToken, docente, soloDocenteDeMateria(materiasDeNotasTarea), guardarNotasTarea);
router.get('/curso/:cursoId', verificarToken, docente, getNotasCursoSemestre);
router.put('/:id', verificarToken, docente, soloDocenteDeMateria(materiaDeTarea('id')), actualizarTarea);
router.delete('/:id', verificarToken, docente, soloDocenteDeMateria(materiaDeTarea('id')), eliminarTarea);

// Archivos adjuntos por el docente (el permiso se revisa antes de recibir los archivos)
router.post('/:tareaId/archivos', verificarToken, docente, soloDocenteDeMateria(materiaDeTarea('tareaId')), subirArchivos, subirArchivosTarea);
router.delete('/archivos/:id', verificarToken, docente, soloDocenteDeMateria(materiaDeArchivoTarea), eliminarArchivoTarea);

// Entregas del estudiante
router.post('/:tareaId/entregas', verificarToken, subirArchivos, subirEntrega);
router.get('/:tareaId/entregas/mias', verificarToken, getMiEntrega);
router.delete('/entregas/archivos/:id', verificarToken, eliminarArchivoEntrega);
// El docente ve todas las entregas de una tarea
router.get('/:tareaId/entregas', verificarToken, docente, soloDocenteDeMateria(materiaDeTarea('tareaId')), getEntregasTarea);

export default router;