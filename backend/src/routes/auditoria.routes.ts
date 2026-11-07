import { Router } from 'express';
import { listarAuditoria } from '../controllers/auditoria.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Solo lectura: el historial no se puede editar ni borrar desde la API.
router.get('/', verificarToken, soloAdmin, listarAuditoria);

export default router;
