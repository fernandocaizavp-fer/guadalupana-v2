import { Router } from 'express';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';
import { crearMatricula, buscarEstudiante, obtenerMatricula, actualizarMatricula, eliminarMatricula, siguienteMatricula } from '../controllers/matricula.controller';
const router = Router();

router.post('/', verificarToken, soloAdmin, crearMatricula);
router.get('/buscar', verificarToken, buscarEstudiante);
router.get('/siguiente/:cursoId', verificarToken, soloAdmin, siguienteMatricula);
router.get('/:id', verificarToken, obtenerMatricula);
router.put('/:id', verificarToken, soloAdmin, actualizarMatricula);
router.delete('/:id', verificarToken, soloAdmin, eliminarMatricula);

export default router;