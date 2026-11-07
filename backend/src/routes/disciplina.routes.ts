import { Router } from 'express';
import {
  guardarNotaDisciplina,
  guardarNotasDisciplinaMasivo,
  getNotasDisciplinaPorMateria,
  getNotasDisciplinaPorCurso,
  getEstudiantesPorMateria
} from '../controllers/disciplina.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';
import { soloDocenteDeMateria, materiaDelCuerpo, materiasDeLista } from '../middlewares/permisos.middleware';

const router = Router();
const docente = soloRoles('ADMIN', 'PROFESOR');

router.post('/', verificarToken, docente, soloDocenteDeMateria(materiaDelCuerpo), guardarNotaDisciplina);
router.post('/masivo', verificarToken, docente, soloDocenteDeMateria(materiasDeLista('notas')), guardarNotasDisciplinaMasivo);
router.get('/estudiantes/:materiaId', verificarToken, docente, getEstudiantesPorMateria);
router.get('/materia/:materiaId', verificarToken, docente, getNotasDisciplinaPorMateria);
router.get('/curso/:cursoId', verificarToken, docente, getNotasDisciplinaPorCurso);

export default router;
