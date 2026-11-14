import { Router } from 'express';
import { listarRecursos, crearRecurso, eliminarRecurso } from '../controllers/recurso.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verificarToken, listarRecursos);
router.post('/', verificarToken, soloRoles('ADMIN', 'PROFESOR'), crearRecurso);
router.delete('/:id', verificarToken, soloRoles('ADMIN', 'PROFESOR'), eliminarRecurso);

export default router;
