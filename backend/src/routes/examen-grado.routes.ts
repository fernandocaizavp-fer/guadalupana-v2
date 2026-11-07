import { Router } from 'express';
import { getEstudiantesExamenGrado, guardarExamenesGrado, getExamenesPorCurso, generarAL23 } from '../controllers/examen-grado.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';
import { soloDocenteDeMateria, materiasDeLista } from '../middlewares/permisos.middleware';

const router = Router();
const docente = soloRoles('ADMIN', 'PROFESOR');

router.get('/materia/:materiaId', verificarToken, docente, getEstudiantesExamenGrado);
router.post('/guardar', verificarToken, docente, soloDocenteDeMateria(materiasDeLista('notas')), guardarExamenesGrado);
router.get('/curso/:cursoId', verificarToken, docente, getExamenesPorCurso);
router.get('/generar-al23/:cursoId', verificarToken, docente, generarAL23);

export default router;
