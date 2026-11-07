import { Router } from 'express';
import { descargarMatricula, descargarCertificado } from '../controllers/documento.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Ficha (AL12) y certificado (AL13) llevan datos personales: solo administración.
router.get('/matricula/:id', verificarToken, soloAdmin, descargarMatricula);
router.get('/certificado/:id', verificarToken, soloAdmin, descargarCertificado);

export default router;
