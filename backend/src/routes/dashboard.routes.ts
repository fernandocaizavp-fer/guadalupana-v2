import { Router } from 'express';
import { obtenerResumen, obtenerResumenProfesor } from '../controllers/dashboard.controller';
import { verificarToken, soloAdmin, soloRoles } from '../middlewares/auth.middleware';

const router = Router();

// Indicadores del panel del administrador (incluye datos financieros).
router.get('/resumen', verificarToken, soloAdmin, obtenerResumen);
// Indicadores del propio docente (usa el id del token, no recibe parámetros).
router.get('/profesor', verificarToken, soloRoles('PROFESOR'), obtenerResumenProfesor);

export default router;
