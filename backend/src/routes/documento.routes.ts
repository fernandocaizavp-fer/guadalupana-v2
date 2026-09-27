import { Router } from 'express';
import { descargarMatricula, descargarCertificado } from '../controllers/documento.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/matricula/:id', verificarToken, descargarMatricula);
router.get('/certificado/:id', verificarToken, descargarCertificado);

export default router;