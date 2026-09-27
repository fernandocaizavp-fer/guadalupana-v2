import { Router } from 'express';
import { login, crearAdmin, cambiarPassword, solicitarRecuperacion, restablecerPassword } from '../controllers/auth.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/crear-admin', verificarToken, soloAdmin, crearAdmin);
router.post('/cambiar-password', cambiarPassword);
router.post('/solicitar-recuperacion', solicitarRecuperacion);
router.post('/restablecer-password', restablecerPassword);

export default router;