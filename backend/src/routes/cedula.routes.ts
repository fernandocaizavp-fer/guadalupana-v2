import { Router } from 'express';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';
import { consultarCedula } from '../controllers/cedula.controller';

const router = Router();

router.get('/:cedula', verificarToken, soloAdmin, consultarCedula);

export default router;