import { Router } from 'express';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';
import { crearCurso, listarCursos, obtenerCurso, actualizarCurso, eliminarCurso, agregarSubmateria, eliminarSubmateria, getSubmaterias, getEstudiantesMateria } from '../controllers/curso.controller';

const router = Router();

router.post('/', verificarToken, soloAdmin, crearCurso);
router.get('/', verificarToken, listarCursos);
router.post('/submaterias', verificarToken, soloAdmin, agregarSubmateria);
router.delete('/submaterias/:id', verificarToken, soloAdmin, eliminarSubmateria);
router.get('/materia/:materiaId/estudiantes', verificarToken, getEstudiantesMateria);
router.get('/:id', verificarToken, obtenerCurso);
router.put('/:id', verificarToken, soloAdmin, actualizarCurso);
router.delete('/:id', verificarToken, soloAdmin, eliminarCurso);
router.get('/:cursoId/submaterias/:parent', verificarToken, getSubmaterias);

export default router;