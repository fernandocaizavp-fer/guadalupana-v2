import { Router } from 'express';
import {
  guardarNotaDisciplina,
  guardarNotasDisciplinaMasivo,
  getNotasDisciplinaPorMateria,
  getNotasDisciplinaPorCurso,
  getEstudiantesPorMateria
} from '../controllers/disciplina.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', verificarToken, soloRoles('ADMIN', 'PROFESOR'), guardarNotaDisciplina);
router.post('/masivo', verificarToken, soloRoles('ADMIN', 'PROFESOR'), guardarNotasDisciplinaMasivo);
router.get('/estudiantes/:materiaId', verificarToken, getEstudiantesPorMateria);
router.get('/materia/:materiaId', verificarToken, getNotasDisciplinaPorMateria);
router.get('/curso/:cursoId', verificarToken, getNotasDisciplinaPorCurso);

export default router;