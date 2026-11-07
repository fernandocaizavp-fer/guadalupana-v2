import { Router } from 'express';
import {
  crearDocente, listarDocentes, eliminarDocente, actualizarDocente,
  asignarProfesor, asignarProfesorPrincipalMateria,
  desasignarProfesor, desasignarProfesorPrincipal,
  getMisMateria, getPerfilEstudiante
} from '../controllers/usuario.controller';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware';
import { getCursosConSubmaterias, subirFotoPerfil } from '../controllers/usuario.controller';
import { subirFoto } from '../middlewares/upload.middleware';
import { propioOAdmin } from '../middlewares/permisos.middleware';


const router = Router();

router.post('/docentes', verificarToken, soloAdmin, crearDocente);
router.get('/docentes', verificarToken, soloAdmin, listarDocentes);
router.put('/docentes/:id', verificarToken, soloAdmin, actualizarDocente);
router.delete('/docentes/:id', verificarToken, soloAdmin, eliminarDocente);
router.post('/asignar-materia', verificarToken, soloAdmin, asignarProfesor);
router.post('/asignar-profesor-principal-materia', verificarToken, soloAdmin, asignarProfesorPrincipalMateria);
router.post('/desasignar-materia', verificarToken, soloAdmin, desasignarProfesor);
router.post('/desasignar-profesor-principal', verificarToken, soloAdmin, desasignarProfesorPrincipal);
// Cada usuario solo consulta lo suyo (un estudiante no puede ver el perfil y las
// notas de otro cambiando el id); el ADMIN consulta cualquiera.
router.get('/mis-materias/:profesorId', verificarToken, propioOAdmin('profesorId'), getMisMateria);
router.post('/foto', verificarToken, subirFoto, subirFotoPerfil);
router.post('/:id/foto', verificarToken, soloAdmin, subirFoto, subirFotoPerfil);
router.get('/perfil-estudiante/:usuarioId', verificarToken, propioOAdmin('usuarioId'), getPerfilEstudiante);
router.get('/cursos-con-submaterias/:profesorId', verificarToken, propioOAdmin('profesorId'), getCursosConSubmaterias);


export default router;