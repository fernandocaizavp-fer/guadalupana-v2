import { Router } from 'express';
import { obtenerResumen } from '../controllers/dashboard.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Indicadores del panel del administrador (incluye datos financieros).
router.get('/resumen', verificarToken, soloAdmin, obtenerResumen);

export default router;
