import { extraerDatosMatricula } from '../controllers/matricula-extraccion.controller';
import { Router } from 'express';
import { verificarToken, soloAdmin, soloRoles } from '../middlewares/auth.middleware';
import { crearMatricula, buscarEstudiante, buscarGlobal, obtenerMatricula, actualizarMatricula, eliminarMatricula, siguienteMatricula, listarArchivadas, reactivarMatricula } from '../controllers/matricula.controller';
const router = Router();

router.post('/extraer-datos', verificarToken, soloAdmin, extraerDatosMatricula);
router.post('/', verificarToken, soloAdmin, crearMatricula);
// Datos personales del estudiante: solo administración.
router.get('/archivadas', verificarToken, soloAdmin, listarArchivadas);
router.put('/:id/reactivar', verificarToken, soloAdmin, reactivarMatricula);
router.get('/buscar', verificarToken, soloAdmin, buscarEstudiante);
router.get('/buscar-global', verificarToken, soloRoles('ADMIN', 'PROFESOR'), buscarGlobal);
router.get('/siguiente/:cursoId', verificarToken, soloAdmin, siguienteMatricula);
router.get('/:id', verificarToken, soloAdmin, obtenerMatricula);
router.put('/:id', verificarToken, soloAdmin, actualizarMatricula);
router.delete('/:id', verificarToken, soloAdmin, eliminarMatricula);

export default router;