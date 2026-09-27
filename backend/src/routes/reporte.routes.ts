import { Router } from 'express';
import { generarAL9 } from '../controllers/reporte.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/al9/:cursoId', verificarToken, soloAdmin, generarAL9);

export default router;