import { Router } from 'express';
import { crearAnuncio, listarAnuncios, listarTodosAnuncios, actualizarAnuncio, eliminarAnuncio, upload } from '../controllers/anuncio.controller';
import { verificarToken, soloRoles } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verificarToken, listarAnuncios);
router.get('/todos', verificarToken, soloRoles('ADMIN', 'PROFESOR'), listarTodosAnuncios);
router.post('/', verificarToken, soloRoles('ADMIN', 'PROFESOR'), upload.single('imagen'), crearAnuncio);
router.put('/:id', verificarToken, soloRoles('ADMIN', 'PROFESOR'), upload.single('imagen'), actualizarAnuncio);
router.delete('/:id', verificarToken, soloRoles('ADMIN', 'PROFESOR'), eliminarAnuncio);

export default router;