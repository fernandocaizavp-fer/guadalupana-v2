import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware';
import { obtenerResumenNotificaciones } from '../controllers/notificacion.controller';

const router = Router();

// Todas las rutas requieren estar autenticado (cualquier rol: ADMIN, PROFESOR, ESTUDIANTE)
router.use(verificarToken);

router.get('/resumen', obtenerResumenNotificaciones);

export default router;
