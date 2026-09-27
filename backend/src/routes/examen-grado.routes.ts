import { Router } from 'express';
import { getEstudiantesExamenGrado, guardarExamenesGrado, getExamenesPorCurso, generarAL23 } from '../controllers/examen-grado.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';

const router = Router();

router.get('/materia/:materiaId', verificarToken, getEstudiantesExamenGrado);
router.post('/guardar', verificarToken, soloRoles('ADMIN', 'PROFESOR'), guardarExamenesGrado);
router.get('/curso/:cursoId', verificarToken, getExamenesPorCurso);
router.get('/generar-al23/:cursoId', verificarToken, generarAL23);

export default router;