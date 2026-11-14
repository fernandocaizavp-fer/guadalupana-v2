import { Router } from 'express';
import { guardarSupletorio, guardarSupletoriosMasivo, generarAL15, generarAL16, generarAL22, generarAL19, generarAL20, getSupletoriosMateria } from '../controllers/supletorio.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';
import { soloDocenteDeMateria, materiaDelCuerpo, materiasDeLista } from '../middlewares/permisos.middleware';

const router = Router();
const docente = soloRoles('ADMIN', 'PROFESOR');

router.post('/', verificarToken, docente, soloDocenteDeMateria(materiaDelCuerpo), guardarSupletorio);
router.post('/masivo', verificarToken, docente, soloDocenteDeMateria(materiasDeLista('supletorios')), guardarSupletoriosMasivo);
router.get('/materia/:materiaId', verificarToken, docente, getSupletoriosMateria);
router.get('/al15/:cursoId', verificarToken, docente, generarAL15);
router.get('/al16/:matriculaId', verificarToken, docente, generarAL16);
router.get('/al20/:cursoId', verificarToken, docente, generarAL20);
router.get('/al22/:cursoId', verificarToken, docente, generarAL22);
router.get('/al19/:cursoId', verificarToken, docente, generarAL19);

export default router;
