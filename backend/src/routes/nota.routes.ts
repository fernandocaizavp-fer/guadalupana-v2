import { Router } from 'express';
import { descargarAL14 } from '../controllers/nota.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';

const router = Router();

router.get('/al14/:cursoId', verificarToken, soloRoles('ADMIN', 'PROFESOR'), descargarAL14);

export default router;
