import { Router } from 'express';
import {
  crearDocente, listarDocentes, eliminarDocente, actualizarDocente,
  asignarProfesor, asignarProfesorPrincipalMateria,
  desasignarProfesor, desasignarProfesorPrincipal,
  getMisMateria, getPerfilEstudiante
} from '../controllers/usuario.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';
import { getCursosConSubmaterias } from '../controllers/usuario.controller';


const router = Router();

router.post('/docentes', verificarToken, soloAdmin, crearDocente);
router.get('/docentes', verificarToken, soloAdmin, listarDocentes);
router.put('/docentes/:id', verificarToken, soloAdmin, actualizarDocente);
router.delete('/docentes/:id', verificarToken, soloAdmin, eliminarDocente);
router.post('/asignar-materia', verificarToken, soloAdmin, asignarProfesor);
router.post('/asignar-profesor-principal-materia', verificarToken, soloAdmin, asignarProfesorPrincipalMateria);
router.post('/desasignar-materia', verificarToken, soloAdmin, desasignarProfesor);
router.post('/desasignar-profesor-principal', verificarToken, soloAdmin, desasignarProfesorPrincipal);
router.get('/mis-materias/:profesorId', verificarToken, getMisMateria);
router.get('/perfil-estudiante/:usuarioId', verificarToken, getPerfilEstudiante);
router.get('/cursos-con-submaterias/:profesorId', verificarToken, getCursosConSubmaterias);


export default router;