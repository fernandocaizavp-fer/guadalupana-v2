import { Router } from 'express';
import { descargarAL14 } from '../controllers/nota.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/al14/:cursoId', verificarToken, descargarAL14);

export default router;